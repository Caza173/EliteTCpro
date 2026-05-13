import React from "react";
import "../../styles/contract-scanner-loader.css";

export default function ContractScannerLoader({ isLoading = true }) {
  if (!isLoading) return null;

  return (
    <div className="contract-scanner-loader-wrapper">
      <div className="contract-loader">
        <span>Reading Contract</span>
      </div>
    </div>
  );
}