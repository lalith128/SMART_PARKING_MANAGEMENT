import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { CreditCard, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/types/supabase";

type Payment = Database["public"]["Tables"]["payments"]["Row"] & {
  bookings: Database["public"]["Tables"]["bookings"]["Row"] & {
    parking_spaces: Database["public"]["Tables"]["parking_spaces"]["Row"];
  };
};

export default function Payments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("online");

  const fetchPayments = useCallback(async () => {
    if (!user) {
      setPayments([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, bookings(*, parking_spaces(*))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load payments. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    fetchPayments();

    // Subscribe to payment changes
    const channel = supabase
      .channel('payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
        },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPayments]);

  const handlePayment = async () => {
    if (!selectedPayment) return;

    try {
      // Mock payment processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { error } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          payment_method: paymentMethod,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment processed successfully.",
      });

      setShowPaymentDialog(false);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process payment. Please try again.",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      case 'refunded':
        return 'text-sky-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'refunded':
        return <CheckCircle className="h-5 w-5 text-sky-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading payments...</div>;
  }

  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <p className="mt-2 text-gray-600">
          View and manage your parking payments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Total Records</p>
          <p className="text-2xl font-semibold text-gray-900">{payments.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Completed Payments</p>
          <p className="text-2xl font-semibold text-emerald-700">
            {payments.filter((p) => p.status === "completed").length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-2xl font-semibold text-indigo-700">₹{totalPaid.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Parking Space</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(new Date(payment.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {payment.bookings.parking_spaces.address}
                  </TableCell>
                  <TableCell>
                    ₹{payment.amount}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <span className={getStatusColor(payment.status)}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {payment.payment_method ? (
                      payment.payment_method.split('_').map(
                        word => word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === 'pending' && (
                      <Button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowPaymentDialog(true);
                        }}
                      >
                        Pay Now
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Choose your payment method to complete the transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">UPI / Online</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPayment && (
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="text-sm text-gray-600">
                  <p>Amount: ₹{selectedPayment.amount}</p>
                  <p>Parking Space: {selectedPayment.bookings.parking_spaces.address}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment}>
              Complete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
