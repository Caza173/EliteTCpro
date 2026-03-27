export const tutorialSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "🚀",
    steps: [
      {
        title: "Create a Transaction",
        content: [
          "Click 'New Transaction' from the Transactions page or Dashboard",
          "Select transaction type: Buyer, Listing, or Dual",
          "Enter the property address and key party information",
          "Set the transaction phase and status"
        ]
      },
      {
        title: "Upload Documents",
        content: [
          "Navigate to the Documents tab inside a transaction",
          "Upload the Purchase & Sale Agreement (P&S)",
          "Upload agency agreements, disclosures, and addenda",
          "The system will attempt to auto-extract key dates and terms"
        ]
      },
      {
        title: "Review Parsed Data",
        content: [
          "After upload, check the extracted deadlines in the Deadlines tab",
          "Verify buyer/seller names, agent info, and financial details",
          "Correct any parsing errors before notifying parties",
          "Use the AI Assistant to validate completeness"
        ]
      },
      {
        title: "Invite the Client",
        content: [
          "Click 'Invite Client' from the transaction detail page",
          "A unique access code is generated automatically",
          "The client receives a link + code to check their status (no login needed)",
          "They can view deadlines and transaction phase updates"
        ]
      }
    ]
  },
  {
    id: "buyer-transactions",
    title: "Buyer Transactions",
    icon: "🏠",
    steps: [
      {
        title: "Setting Up a Buyer Transaction",
        content: [
          "Select 'Buyer' as the transaction type",
          "Enter buyer name(s), agent, and lender information",
          "Set the contract date and closing date",
          "Upload the Purchase & Sale Agreement"
        ]
      },
      {
        title: "Managing Contingencies",
        content: [
          "Go to the Deadlines tab and find the Contingencies section",
          "Add Inspection, Financing, Appraisal, and Due Diligence contingencies",
          "Set days-from-effective or a specific due date",
          "Track status: Pending → Scheduled → Completed / Waived"
        ]
      },
      {
        title: "Inspection Phase",
        content: [
          "Confirm inspection is scheduled before the deadline",
          "Upload the inspection report to the Documents tab",
          "If repairs are needed, draft an addendum using the Addendum Builder",
          "Mark the inspection contingency as Completed once resolved"
        ]
      },
      {
        title: "Clear to Close",
        content: [
          "Ensure all required documents are uploaded and approved",
          "Confirm lender has issued clear to close",
          "Verify final walkthrough is scheduled",
          "Run a Compliance Scan to check for any blockers"
        ]
      }
    ]
  },
  {
    id: "listing-transactions",
    title: "Listing Transactions",
    icon: "📋",
    steps: [
      {
        title: "Creating a Listing",
        content: [
          "Select 'Listing' as the transaction type",
          "Fill out the Listing Intake tab with MLS info, pricing, and showing instructions",
          "Set list price, go-live date, and photo schedule",
          "Enter seller contact information"
        ]
      },
      {
        title: "Converting a Listing to Under Contract",
        content: [
          "Once an offer is accepted, click 'Convert to Transaction' on the transaction",
          "Enter buyer details, sale price, and contract dates",
          "The transaction type will update to Dual or Buyer side",
          "All listing data is preserved"
        ]
      },
      {
        title: "Listing Compliance",
        content: [
          "Upload the signed Listing Agreement before going live",
          "Add any seller disclosures to the Documents tab",
          "Use Compliance Scan to verify all required docs are present",
          "Track MLS status: Pre-Listing → Active → Under Contract"
        ]
      }
    ]
  },
  {
    id: "documents-compliance",
    title: "Documents & Compliance",
    icon: "📄",
    steps: [
      {
        title: "Uploading Documents",
        content: [
          "Open the Documents tab in any transaction",
          "Drag and drop files or click to browse",
          "Select the document type (P&S, Addendum, Disclosure, etc.)",
          "The system auto-detects types based on filename keywords"
        ]
      },
      {
        title: "Running a Compliance Scan",
        content: [
          "Go to the Compliance tab in a transaction",
          "Click 'Run Compliance Scan' to analyze uploaded documents",
          "Review blockers (must fix) vs warnings (review recommended)",
          "Resolve issues and re-scan to confirm clearance"
        ]
      },
      {
        title: "Document Checklist",
        content: [
          "The checklist shows required documents for your transaction type",
          "Status: Missing → Uploaded → Approved",
          "Admins can approve documents from the checklist",
          "Clients see a limited view of document status"
        ]
      },
      {
        title: "Sending Documents via Email",
        content: [
          "Click 'Send Email' from any transaction",
          "In the email composer, select documents to attach",
          "Document links are appended to the email body",
          "All sent emails are logged in the Activity Feed"
        ]
      }
    ]
  },
  {
    id: "deadlines-calendar",
    title: "Deadlines & Calendar",
    icon: "📅",
    steps: [
      {
        title: "Understanding the Deadlines Tab",
        content: [
          "The Deadlines tab shows ALL deadlines in one unified view",
          "System deadlines (contract date, closing) are at the top",
          "Contingency deadlines are auto-populated from the Contingencies section",
          "Custom deadlines can be added manually"
        ]
      },
      {
        title: "Syncing to Google Calendar",
        content: [
          "Click the calendar icon next to any deadline row",
          "The deadline syncs to your connected Google Calendar",
          "A green checkmark confirms successful sync",
          "Updates to dates will update the calendar event automatically"
        ]
      },
      {
        title: "Sending a Timeline Email",
        content: [
          "Click 'Send Timeline' at the top of the Deadlines tab",
          "A formatted email with all key deadlines is sent to client and agent",
          "Customize recipients in the email composer before sending"
        ]
      },
      {
        title: "Monitoring Overdue Deadlines",
        content: [
          "Overdue deadlines appear in red on the Deadlines tab",
          "The Dashboard shows alerts for approaching deadlines (72h, 48h, 24h)",
          "Use 'Send Timeline' to proactively communicate with parties"
        ]
      }
    ]
  },
  {
    id: "communication",
    title: "Communication",
    icon: "✉️",
    steps: [
      {
        title: "Sending Emails from a Transaction",
        content: [
          "Click 'Send Email' from any transaction detail page",
          "Recipients are pre-filled from the transaction's contact fields",
          "Add or remove recipients as needed",
          "Attach documents directly from the transaction"
        ]
      },
      {
        title: "Under Contract Email",
        content: [
          "Click 'Under Contract Email' when a deal goes under contract",
          "A pre-built HTML email is generated with all contingencies and deadlines",
          "Review and customize before sending",
          "Sent to agents, lender, title, and clients automatically"
        ]
      },
      {
        title: "Using the AI Assistant to Draft Emails",
        content: [
          "Open the AI Assistant panel on any transaction",
          "Type: 'Draft an email to the lender about the inspection results'",
          "The AI will generate a professional email with transaction context",
          "Click 'Send as Email' to open the composer pre-filled"
        ]
      },
      {
        title: "Deadline Alerts",
        content: [
          "The system automatically sends deadline reminder emails",
          "Reminders go out at 72h, 48h, and 24h before each deadline",
          "Agents can respond to extend deadlines via the response link",
          "All responses are logged in the AI Activity Log"
        ]
      }
    ]
  },
  {
    id: "advanced-features",
    title: "Advanced Features",
    icon: "⚡",
    steps: [
      {
        title: "Addendum Builder",
        content: [
          "Navigate to Tools → Addendum Builder",
          "Select a clause from the library or write custom text",
          "Tag clauses by category (deadline, financial, inspection, etc.)",
          "Generate and send the addendum directly from the builder"
        ]
      },
      {
        title: "Commission Statements",
        content: [
          "Navigate to Commission from the sidebar",
          "Create a new statement linked to a transaction",
          "Enter sale price, commission percentages, and split details",
          "Send to agent for approval, then forward to title company"
        ]
      },
      {
        title: "Fuel Prorations",
        content: [
          "Navigate to Fuel Prorations from the sidebar",
          "Enter tank details, gallons, and price per gallon",
          "The system calculates proration amounts automatically",
          "Generate and send to title company"
        ]
      },
      {
        title: "SkySlope Sync",
        content: [
          "Transactions can be synced to SkySlope automatically",
          "The sync badge shows: Not Synced → Pending → Synced / Error",
          "Click the sync badge to manually trigger a sync",
          "Check Settings to configure your SkySlope credentials"
        ]
      }
    ]
  },
  {
    id: "common-mistakes",
    title: "Common Mistakes",
    icon: "⚠️",
    steps: [
      {
        title: "Wrong Effective Date",
        content: [
          "The effective/acceptance date drives all contingency deadline calculations",
          "Always verify the contract date before adding contingencies",
          "A wrong date will cause all auto-calculated deadlines to be off",
          "Double-check against the signed P&S Agreement"
        ]
      },
      {
        title: "Missing Inspection Deadline",
        content: [
          "Inspection deadlines are often the shortest in the contract (7–10 days)",
          "Set the inspection contingency immediately after uploading the P&S",
          "Mark as Scheduled once the inspection is booked",
          "Never leave it as Pending past the deadline date"
        ]
      },
      {
        title: "Not Adding Lender / Title Contact",
        content: [
          "Without lender/title contact info, automated emails won't reach them",
          "Add lender name, email, and phone in the transaction contact fields",
          "This data is used in the Under Contract Email and deadline alerts",
          "Contacts page shows all parties across all transactions"
        ]
      },
      {
        title: "Forgetting to Run Compliance Scan",
        content: [
          "Always run a compliance scan before marking a deal as Clear to Close",
          "Scans check for missing signatures, missing documents, and deadline gaps",
          "Compliance issues show on the Dashboard as alerts",
          "Re-run after uploading new documents"
        ]
      }
    ]
  },
  {
    id: "risk-deadlines",
    title: "Risk & What Happens If You Miss",
    icon: "🚨",
    steps: [
      {
        title: "Missed Inspection Deadline",
        content: [
          "Risk: Buyer loses the right to inspect the property",
          "Impact: Cannot negotiate repairs or credits after deadline",
          "Prevention: Set inspection in the first 24h after contract",
          "If missed: Consult attorney — you may need a written waiver"
        ]
      },
      {
        title: "Missed Financing Deadline",
        content: [
          "Risk: Buyer may be unable to back out without losing earnest money",
          "Impact: Deal could proceed even if financing falls through",
          "Prevention: Confirm lender timeline matches contract dates",
          "If missed: Draft an addendum to extend the financing deadline"
        ]
      },
      {
        title: "Missing Required Documents",
        content: [
          "Risk: Compliance blockers that delay or derail closing",
          "Impact: Title company may not proceed without required disclosures",
          "Prevention: Run compliance scans weekly on active transactions",
          "If missed: Upload immediately and notify relevant parties"
        ]
      },
      {
        title: "Not Sending the Under Contract Email",
        content: [
          "Risk: Parties are not aligned on deadlines and responsibilities",
          "Impact: Inspectors, lenders, and title don't know their timelines",
          "Prevention: Send the Under Contract Email within 24h of acceptance",
          "It sets expectations and creates a paper trail"
        ]
      }
    ]
  }
];

export const faqSections = [
  {
    title: "Transactions",
    items: [
      {
        question: "Do I have to enter everything manually?",
        answer: "No. Upload the Purchase & Sale Agreement and the system automatically extracts key dates, party names, and financial terms. You'll just need to verify and correct any parsing errors."
      },
      {
        question: "Can I edit parsed data after upload?",
        answer: "Yes. All fields in a transaction are fully editable. Click on any field in the transaction detail page to edit it inline."
      },
      {
        question: "How do I change the transaction phase?",
        answer: "Use the phase dropdown at the top of the transaction detail page. You can also mark phases complete using the Transaction Phases checklist on the Overview tab."
      },
      {
        question: "Can one transaction have multiple buyers or sellers?",
        answer: "Yes. The transaction supports arrays of buyers and sellers. Edit the Buyer or Seller field and add multiple names separated as needed."
      },
      {
        question: "How do I delete a transaction?",
        answer: "Click the 'Delete' button (red) at the top of the transaction detail page. This action is permanent and cannot be undone."
      }
    ]
  },
  {
    title: "Documents",
    items: [
      {
        question: "What file types are supported?",
        answer: "PDF, DOCX, JPG, and PNG files are supported. PDFs work best for auto-parsing and compliance scanning."
      },
      {
        question: "Why didn't the system extract my deadlines?",
        answer: "Parsing works best with text-based PDFs. Scanned images may not parse correctly. You can always enter dates manually in the Deadlines tab."
      },
      {
        question: "How do I attach a document to an email?",
        answer: "Open the email composer from any transaction. Scroll down to the 'Attach Documents' section and check the documents you want to include."
      },
      {
        question: "What is the document checklist?",
        answer: "The checklist shows all required documents for your transaction type. Status flows from Missing → Uploaded → Approved. Admins must approve uploaded documents."
      }
    ]
  },
  {
    title: "Deadlines & Contingencies",
    items: [
      {
        question: "How do contingency deadlines get calculated?",
        answer: "Enter the number of days from the effective date (contract date) in the contingency form. The system auto-calculates the exact due date. You can also set a date manually."
      },
      {
        question: "Can I sync deadlines to Google Calendar?",
        answer: "Yes. Click the calendar icon next to any deadline row in the Deadlines tab. You must have Google Calendar connected in your settings."
      },
      {
        question: "What's the difference between system deadlines and contingency deadlines?",
        answer: "System deadlines (contract date, earnest money, closing date) are stored directly on the transaction. Contingency deadlines come from the Contingency entity and are more detailed, including scheduled dates and status tracking."
      },
      {
        question: "How do I add a custom deadline?",
        answer: "Scroll to the bottom of the Deadlines tab and click 'Add Custom Deadline'. Enter a name, date, and optional time. These are stored as Contingency records with type 'Other'."
      }
    ]
  },
  {
    title: "Email & Communication",
    items: [
      {
        question: "How do I send an email from a transaction?",
        answer: "Click 'Send Email' at the top of the transaction detail page. Recipients are pre-filled from the transaction contacts. You can add or remove recipients before sending."
      },
      {
        question: "What is the Under Contract Email?",
        answer: "It's a pre-built HTML email that summarizes the deal — parties, contingencies, deadlines, and agent contacts. Send it within 24 hours of going under contract to align all parties."
      },
      {
        question: "Does the system send automated reminders?",
        answer: "Yes. Deadline alerts are sent automatically at 72h, 48h, and 24h before each contingency deadline. Agents can respond to request extensions."
      },
      {
        question: "Can agents respond to deadline alerts?",
        answer: "Yes. Each alert email includes a response link. Agents can click Yes/No to confirm or request an extension. Responses are logged in the AI Activity Log."
      }
    ]
  },
  {
    title: "Users & Roles",
    items: [
      {
        question: "What roles are available?",
        answer: "Owner, Admin, TC Lead, TC, Agent, and Client. Owners and admins have full access. TCs manage transactions. Agents see their own deals. Clients have read-only portal access."
      },
      {
        question: "How do I invite a client to the portal?",
        answer: "Click 'Invite Client' on the transaction detail page. The client receives a unique access code. They visit the Client Lookup page and enter the code — no login required."
      },
      {
        question: "How do I invite a new team member?",
        answer: "Go to User Management from the sidebar. Enter their email and assign a role. They'll receive an invitation to create their account."
      }
    ]
  },
  {
    title: "AI Assistant",
    items: [
      {
        question: "What can the AI Assistant do?",
        answer: "The AI has full context on each transaction — deadlines, documents, compliance issues, and party contacts. It can summarize deals, draft emails, identify missing items, and recommend next steps."
      },
      {
        question: "How do I get the AI to draft an email?",
        answer: "Open the AI panel on a transaction and type something like 'Draft an email to the lender about the upcoming appraisal deadline'. The AI will generate a professional email you can send directly."
      },
      {
        question: "Can the AI identify compliance issues?",
        answer: "Yes. Ask 'Are there any compliance issues?' or 'What documents are missing?' and the AI will review the transaction data and identify gaps."
      }
    ]
  }
];

export const contextMap = {
  "intake": [
    "Upload the Purchase & Sale Agreement",
    "Enter all party contact information",
    "Set the contract date and closing date",
    "Add lender and title company details"
  ],
  "under_contract": [
    "Send the Under Contract Email to all parties",
    "Confirm earnest money deadline",
    "Schedule the inspection immediately",
    "Add all contingency deadlines"
  ],
  "inspection": [
    "Confirm inspection is scheduled",
    "Upload the inspection report after completion",
    "Draft a repair addendum if needed",
    "Mark inspection contingency as Completed"
  ],
  "financing": [
    "Confirm lender has the loan in process",
    "Track the financing commitment deadline",
    "Follow up with lender on appraisal order",
    "Upload any lender-required documents"
  ],
  "appraisal": [
    "Confirm appraisal is ordered",
    "Track the appraisal deadline",
    "Upload the appraisal report when received",
    "Address any value gap with lender/agent"
  ],
  "clear_to_close": [
    "Run a final Compliance Scan",
    "Confirm all documents are approved",
    "Schedule the final walkthrough",
    "Prepare closing instructions for title"
  ],
  "closing": [
    "Confirm utilities & access for closing day",
    "Send closing instructions to all parties",
    "Verify commission statement is approved",
    "Upload final closing documents"
  ],
  "closed": [
    "Upload all post-closing documents",
    "Generate and send the commission statement",
    "Archive the transaction",
    "Request client review or referral"
  ]
};