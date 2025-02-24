
import { Link } from "react-router-dom";
import { Car, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckEmail() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-purple-700 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 animate-fade-in-up text-center">
        <Link to="/" className="inline-flex items-center gap-2 text-3xl font-bold text-teal-600 hover:scale-105 transition-all mb-8">
          <Car className="h-8 w-8" />
          SmartPark
        </Link>

        <div className="bg-teal-50 rounded-xl p-6 mb-8">
          <Mail className="w-16 h-16 text-teal-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email</h2>
          <p className="text-gray-600">
            We've sent you an email with instructions to verify your account. Please click the link in the email to continue.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or try signing up again.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button
              asChild
              className="bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-medium text-lg hover:scale-105 transition-all"
            >
              <Link to="/signin">
                Return to Sign In
              </Link>
            </Button>
            
            <Button
              asChild
              variant="outline"
              className="border-teal-200 hover:border-teal-300 text-teal-600 py-3 rounded-lg font-medium hover:scale-105 transition-all"
            >
              <Link to="/">
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
