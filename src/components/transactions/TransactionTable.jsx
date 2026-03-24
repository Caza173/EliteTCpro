import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, MapPin, User, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const DEADLINE_FIELDS = [
  "earnest_money_deadline", "inspection_deadline", "due_diligence_deadline",
  "appraisal_deadline", "financing_deadline", "ctc_target", "closing_date",
];

export function calcPriorityScore(tx, complianceIssues = []) {
  const today = new Date();
  let score = 0;

  for (const field of DEADLINE_FIELDS) {
    if (!tx[field]) continue;
    const d = new Date(tx[field]);
    const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0)       score += 100; // overdue
    else if (daysLeft <= 3) score += 80;
    else if (daysLeft <= 7) score += 50;
  }

  if (tx.closing_date) {
    const closingDays = Math.ceil((new Date(tx.closing_date) - today) / (1000 * 60 * 60 * 24));
    if (closingDays >= 0 && closingDays <= 7) score += 40;
  }

  const openTasks = (tx.tasks || []).filter(t => !t.completed).length;
  if (openTasks > 0) score += 20;

  if (Array.isArray(complianceIssues) ? complianceIssues.length > 0 : complianceIssues > 0) score += 30;

  return score;
}

function getPriorityReasons(tx) {
  const today = new Date();
  const reasons = [];
  const DEADLINE_LABELS = {
    earnest_money_deadline: "Earnest Money",
    inspection_deadline: "Inspection",
    due_diligence_deadline: "Due Diligence",
    appraisal_deadline: "Appraisal",
    financing_deadline: "Financing",
    ctc_target: "Clear to Close",
    closing_date: "Closing",
  };
  for (const field of DEADLINE_FIELDS) {
    if (!tx[field]) continue;
    const d = new Date(tx[field]);
    const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) reasons.push(`${DEADLINE_LABELS[field]} deadline overdue`);
    else if (daysLeft <= 3) reasons.push(`${DEADLINE_LABELS[field]} due in ${daysLeft}d`);
    else if (daysLeft <= 7) reasons.push(`${DEADLINE_LABELS[field]} due in ${daysLeft}d`);
  }
  const openTasks = (tx.tasks || []).filter(t => !t.completed).length;
  if (openTasks > 0) reasons.push(`${openTasks} open task${openTasks > 1 ? "s" : ""}`);
  return reasons;
}

function PriorityBadge({ score, tx }) {
  const reasons = tx ? getPriorityReasons(tx) : [];
  const [show, setShow] = React.useState(false);

  const badge = score >= 80 ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 whitespace-nowrap cursor-default">
      <AlertTriangle className="w-2.5 h-2.5" /> Attention
    </span>
  ) : score >= 40 ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap cursor-default">
      <AlertTriangle className="w-2.5 h-2.5" /> Watch
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap cursor-default">
      <CheckCircle2 className="w-2.5 h-2.5" /> On Track
    </span>
  );

  if (reasons.length === 0) return badge;

  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {badge}
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none">
          <p className="font-semibold mb-1 text-gray-300">Needs attention:</p>
          <ul className="space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-red-400 mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

const PHASES = [
  "Pre-Contract", "Offer Drafting", "Offer Accepted", "Escrow Opened",
  "Inspection Period", "Repair Negotiation", "Appraisal Ordered",
  "Loan Processing", "Clear to Close", "Final Walkthrough", "Closing", "Post Closing"
];

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

export default function TransactionTable({ transactions, sorted = false }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No transactions yet</h3>
        <p className="text-sm text-gray-500">Create your first transaction to get started.</p>
      </div>
    );
  }

  const rows = sorted
    ? [...transactions].sort((a, b) => {
        const diff = calcPriorityScore(b) - calcPriorityScore(a);
        if (diff !== 0) return diff;
        if (!a.closing_date && !b.closing_date) return 0;
        if (!a.closing_date) return 1;
        if (!b.closing_date) return -1;
        return new Date(a.closing_date) - new Date(b.closing_date);
      })
    : transactions;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-200/60">
            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Property</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Agent</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Contract Date</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phase</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Priority</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tx) => {
            const score = calcPriorityScore(tx);
            return (
            <TableRow key={tx.id} className={`hover:bg-gray-50/60 transition-colors border-gray-100 ${score >= 80 ? "bg-red-50/30" : score >= 40 ? "bg-amber-50/20" : ""}`}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="font-medium text-gray-900 text-sm truncate max-w-[120px] sm:max-w-[200px] block">{tx.address}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {tx.buyers?.length ? tx.buyers[0] : (tx.buyer || "—")}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-gray-600">{tx.agent}</TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {tx.contract_date ? format(new Date(tx.contract_date), "MMM d, yyyy") : "—"}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                  {PHASES[(tx.phase || 1) - 1]}
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline" className={`text-xs font-medium capitalize ${statusStyles[tx.status] || statusStyles.active}`}>
                  {tx.status || "active"}
                </Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <PriorityBadge score={score} tx={tx} />
              </TableCell>
              <TableCell className="text-right">
                <Link to={createPageUrl("TransactionDetail") + `?id=${tx.id}`}>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}