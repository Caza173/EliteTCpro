import React from "react";

export default function ContractLoaderModal({ isOpen, status = "Reading Contract" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="contract-loader">
        <span>{status}</span>
      </div>
    </div>
  );
}