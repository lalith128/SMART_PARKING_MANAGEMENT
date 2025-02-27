import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";
import { Car } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Explicitly construct the reset URL with the current origin
      const resetPasswordURL = `${window.location.origin}/reset-password`;
      console.log('Reset password URL:', resetPasswordURL);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetPasswordURL
      });

      if (error) {
        throw error;
      }

      setSubmitted(true);
      toast.success("Password reset link has been sent to your email!");
    } catch (error) {
      console.error("Error sending reset password email:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send reset password email");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-600 to-purple-700 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 animate-fade-in-up">
          <div className="text-center mb-6">
            <Car className="h-12 w-12 text-teal-600 mx-auto" />
            <h2 className="text-2xl font-bold mt-4 text-gray-900">Check Your Email</h2>
            <p className="mt-2 text-gray-600">
              We've sent a password reset link to your email address.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              If you don't see the email in your inbox, please check your spam folder.
              The link will expire after 24 hours.
            </p>
          </div>
          <Link
            to="/signin"
            className="block w-full text-center mt-4 text-teal-600 hover:text-teal-700"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-purple-700 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 animate-fade-in-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-3xl font-bold text-teal-600 hover:scale-105 transition-all">
            <Car className="h-8 w-8" />
            SmartPark
          </Link>
          <h2 className="text-3xl font-bold mt-6 text-gray-900">Reset Password</h2>
          <p className="text-gray-600 mt-2">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium text-lg hover:scale-105 transition-all flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>

          <Link
            to="/signin"
            className="block text-center text-teal-600 hover:text-teal-700 mt-4 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </form>
      </div>
    </div>
  );
}
