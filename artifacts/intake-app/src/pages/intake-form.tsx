import { Layout } from "@/components/layout";
import { RecordForm, RecordFormValues } from "@/components/record-form";
import { useCreateRecord, getGetRecordsQueryKey, getGetAnalyticsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function IntakeFormPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formInstanceKey, setFormInstanceKey] = useState(0);

  const createRecord = useCreateRecord({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Intake record has been saved successfully.",
          variant: "default",
        });
        queryClient.invalidateQueries({ queryKey: getGetRecordsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAnalyticsQueryKey() });
        setFormInstanceKey((prev) => prev + 1);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to save record. " + (error.message || ""),
          variant: "destructive",
        });
      }
    }
  });

  const handleSubmit = async (data: RecordFormValues) => {
    await createRecord.mutateAsync({ data });
  };

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">New Customer Intake</h2>
        <p className="text-muted-foreground mt-1">Record a new service request or repair job.</p>
      </div>
      
      <RecordForm 
        key={formInstanceKey}
        onSubmit={handleSubmit} 
        isSubmitting={createRecord.isPending} 
      />
    </Layout>
  );
}
