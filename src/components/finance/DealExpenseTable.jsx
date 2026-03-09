import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const DEFAULT_CATEGORIES = [
  "Photography", "Videography", "Drone", "Marketing", "Staging",
  "Mileage", "Client Gifts", "Inspection Fees", "Home Warranty", "Other"
];

const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

export default function DealExpenseTable({ transactionId, brokerageId, expenses, expensesTotal }) {
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState("Photography");
  const [customCategory, setCustomCategory] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.DealExpense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", transactionId] });
      setNewAmount("");
      setNewNotes("");
      setCustomCategory("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DealExpense.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses", transactionId] }),
  });

  const handleAdd = () => {
    if (!newAmount) return;
    const cat = newCategory === "Other (custom)" ? customCategory || "Other" : newCategory;
    addMutation.mutate({
      transaction_id: transactionId,
      brokerage_id: brokerageId,
      category: cat,
      amount: parseFloat(newAmount) || 0,
      notes: newNotes,
    });
  };

  return (
    <div className="space-y-3">
      {/* Existing expenses */}
      {expenses.length > 0 ? (
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Category</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Amount</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Notes</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">{e.category}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-900">{fmt(e.amount)}</td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{e.notes || "—"}</td>
                  <td className="px-2 py-2">
                    <button onClick={() => deleteMutation.mutate(e.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-3 py-2 font-bold text-gray-800">Total</td>
                <td className="px-3 py-2 text-right font-bold text-rose-600 tabular-nums">{fmt(expensesTotal)}</td>
                <td colSpan="2" />
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-2">No expenses added yet.</p>
      )}

      {/* Add new expense */}
      <div className="flex flex-wrap gap-2 items-end pt-2 border-t border-gray-100">
        <div className="flex-1 min-w-32">
          <p className="text-xs text-gray-500 mb-1">Category</p>
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEFAULT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              <SelectItem value="Other (custom)">Custom...</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {newCategory === "Other (custom)" && (
          <div className="flex-1 min-w-28">
            <p className="text-xs text-gray-500 mb-1">Custom Name</p>
            <Input className="h-8 text-sm" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="e.g. Lockbox" />
          </div>
        )}
        <div className="w-28">
          <p className="text-xs text-gray-500 mb-1">Amount ($)</p>
          <Input type="number" className="h-8 text-sm" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0" />
        </div>
        <div className="flex-1 min-w-28">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <Input className="h-8 text-sm" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional" />
        </div>
        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd} disabled={addMutation.isPending}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}