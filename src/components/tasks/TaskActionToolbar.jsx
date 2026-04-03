import React, { lazy, Suspense } from "react";
import { useCurrentUser } from "@/components/auth/useCurrentUser";

const ZillowReviewAction = lazy(() => import("./ZillowReviewAction"));
const UtilityRequestAction = lazy(() => import("./UtilityRequestAction"));

export default function TaskActionToolbar({ task, transaction, onTaskUpdated, phaseNum }) {
  const { data: currentUser } = useCurrentUser();
  
  if (!transaction || !currentUser) return null;

  const isZillowReviewTask = task.title?.toLowerCase().includes("zillow") && task.title?.toLowerCase().includes("review");
  const isUtilityRequestTask = task.title?.toLowerCase().includes("utility") && phaseNum === 3;

  return (
    <Suspense fallback={null}>
      {isZillowReviewTask && task.phase === 4 && (
        <ZillowReviewAction 
          task={task} 
          transaction={transaction} 
          currentUser={currentUser} 
          onTaskUpdated={onTaskUpdated} 
        />
      )}
      {isUtilityRequestTask && (
        <UtilityRequestAction 
          task={task} 
          transaction={transaction} 
          currentUser={currentUser} 
          onTaskUpdated={onTaskUpdated} 
        />
      )}
    </Suspense>
  );
}