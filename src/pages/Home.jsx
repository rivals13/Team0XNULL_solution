import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Notification from "./Notification";

// Image Assets
import vianetImg from "../assets/vianet.png";
import neaImg from "../assets/nea.jpg";
import lbefImg from "../assets/lbef.jpg";

const Icon = ({ name, fill = 0, size = 24, className = "" }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{
      fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size,
    }}
  >
    {name}
  </span>
);

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // WALKTHROUGH STATES
  const [showWalkthrough, setShowWalkthrough] = useState(true);
  const [walkthroughStep, setWalkthroughStep] = useState("intro");
  const [selectedUtility, setSelectedUtility] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // DASHBOARD STATES
  const [isLoadingUtilities, setIsLoadingUtilities] = useState(true);
  const [showFullNotifications, setShowFullNotifications] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchingNotifications, setIsSearchingNotifications] =
    useState(false);

  const [showPaymentPortal, setShowPaymentPortal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);

  // NEW STATES
  const [showRecurringPrompt, setShowRecurringPrompt] = useState(false);
  const [showPaidConfirmation, setShowPaidConfirmation] = useState(false);
  const [paidToName, setPaidToName] = useState("");
  const [showNEAAlert, setShowNEAAlert] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingUtilities(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleBellClick = () => {
    if (!showDropdown) {
      setShowDropdown(true);
      setIsSearchingNotifications(true);

      setTimeout(() => {
        setIsSearchingNotifications(false);
      }, 1200);
    } else {
      setShowDropdown(false);
    }
  };

  const handleCloseSetup = () => {
    if (walkthroughStep !== "intro") {
      setShowExitConfirm(true);
    } else {
      setShowWalkthrough(false);
    }
  };

  const finishSetup = () => {
    setShowWalkthrough(false);
    setWalkthroughStep("intro");
  };

  const openLBEFPayment = () => {
    setPaymentDetails({
      name: "LBEF College",
      id: "STU-9841-2024",
      amount: "100,000",
      type: "Semester Fee",
      icon: lbefImg,
    });

    setShowDropdown(false);
    setShowPaymentPortal(true);
  };

  // NEW: Handle Pay Now — show paid confirmation then recurring prompt
  const handlePayNow = () => {
    const name = paymentDetails?.name;
    setShowPaymentPortal(false);
    setPaidToName(name);
    setShowPaidConfirmation(true);

    setTimeout(() => {
      setShowPaidConfirmation(false);
      setShowRecurringPrompt(true);
    }, 2000);
  };

  // NEW: Handle NEA notification click
  const openNEAAlert = () => {
    setShowDropdown(false);
    setShowNEAAlert(true);
  };

  return (
    <div className="bg-[#f7faf9] text-[#181c1c] min-h-screen pb-28 font-sans relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes dropdownReveal {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes itemSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-dropdown-reveal {
          animation: dropdownReveal 0.3s ease-out forwards;
        }

        .animate-stagger-1 {
          animation: itemSlideIn 0.5s ease-out 0.1s both;
        }

        .animate-stagger-2 {
          animation: itemSlideIn 0.5s ease-out 0.25s both;
        }

        .animate-stagger-3 {
          animation: itemSlideIn 0.5s ease-out 0.4s both;
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>

      {/* WALKTHROUGH */}
      {showWalkthrough && (
        <div className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center animate-fade-in p-6">

          {/* CLOSE BUTTON */}
          <header className="absolute top-6 right-6 z-20">
            <button
              onClick={handleCloseSetup}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:scale-90 transition-all"
            >
              <Icon name="close" className="text-gray-600" size={20} />
            </button>
          </header>

          {/* STEP 1 */}
          {walkthroughStep === "intro" && (
            <div className="max-w-md w-full flex flex-col items-center animate-fade-in">

              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#a1f3d1] opacity-30 blur-3xl"></div>
                <div className="absolute top-1/2 -left-32 w-[500px] h-[500px] rounded-full bg-[#ffdf9f] opacity-20 blur-3xl"></div>
              </div>

              <div className="relative h-64 w-full flex items-center justify-center mb-12 z-10">
                <div className="w-48 h-72 bg-gradient-to-br from-[#00654b] to-[#004b37] rounded-[32px] shadow-2xl rotate-[-10deg] flex flex-col p-6 text-white relative">
                  <div className="flex justify-between items-start mb-12">
                    <div className="w-10 h-8 bg-yellow-400/80 rounded-md"></div>
                    <Icon name="contactless" />
                  </div>

                  <div className="mt-auto">
                    <div className="h-3 w-32 bg-white/20 rounded mb-2"></div>
                    <div className="h-3 w-20 bg-white/20 rounded"></div>
                  </div>
                </div>

                <div className="absolute top-10 right-4 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 animate-bounce shadow-emerald-200/50">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Icon
                      name="check"
                      className="text-emerald-600"
                      size={20}
                    />
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">
                      Automation
                    </div>

                    <div className="text-xs font-black text-emerald-700">
                      ACTIVE
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center z-10">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 leading-tight mb-4">
                  Smart Bills, <br />
                  <span className="text-[#00654b]">Zero Stress.</span>
                </h1>

                <p className="text-gray-500 text-sm font-medium mb-10 leading-relaxed px-4">
                  Automate your utility cycles and get notified before
                  deadlines. Save time and avoid late fees instantly.
                </p>

                <div className="space-y-4">
                  <button
                    onClick={() => setWalkthroughStep("select")}
                    className="w-full h-16 bg-[#004b37] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all"
                  >
                    Get Started
                    <Icon name="arrow_forward" />
                  </button>

                  <button
                    onClick={() => setShowWalkthrough(false)}
                    className="w-full py-2 text-sm font-bold text-gray-400"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {walkthroughStep === "select" && (
            <div className="max-w-md w-full animate-slide-up">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                What do you pay?
              </h2>

              <p className="text-gray-500 text-sm mb-8">
                Select a utility to set up your first smart bill.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-10">
                {[
                  "Electricity",
                  "Water",
                  "Internet",
                  "Television",
                ].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setSelectedUtility(item);
                      setWalkthroughStep("confirm");
                    }}
                    className="p-6 rounded-3xl border-2 border-gray-100 bg-gray-50 flex flex-col items-center gap-3 hover:border-[#00654b] hover:bg-emerald-50 transition-all active:scale-95"
                  >
                    <Icon
                      name={
                        item === "Electricity"
                          ? "bolt"
                          : item === "Water"
                          ? "water_drop"
                          : item === "Internet"
                          ? "wifi"
                          : "tv"
                      }
                      size={32}
                      className="text-[#00654b]"
                    />

                    <span className="font-bold text-gray-700">
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {walkthroughStep === "confirm" && (
            <div className="max-w-md w-full text-center animate-slide-up">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon
                  name="edit_document"
                  className="text-[#00654b]"
                  size={32}
                />
              </div>

              <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
                Add {selectedUtility} details?
              </h2>

              <p className="text-gray-500 text-sm mb-10 leading-relaxed">
                Adding details now lets us track your bills and notify you
                automatically.
              </p>

              <div className="space-y-4">
                <button
                  onClick={() => setWalkthroughStep("details")}
                  className="w-full h-16 bg-[#004b37] text-white rounded-2xl font-bold shadow-lg"
                >
                  Yes, add details
                </button>

                <button
                  onClick={finishSetup}
                  className="w-full h-16 bg-gray-100 text-gray-600 rounded-2xl font-bold"
                >
                  No, do it later
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {walkthroughStep === "details" && (
            <div className="max-w-md w-full animate-slide-up">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                {selectedUtility} Account
              </h2>

              <p className="text-gray-500 text-sm mb-8">
                Enter your customer ID or account number.
              </p>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-2">
                    Customer ID / SC No.
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. 10293485"
                    className="w-full h-16 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 font-bold focus:border-[#00654b] outline-none transition-all"
                  />
                </div>

                <button
                  onClick={() => {
                    alert("Setup Complete!");
                    finishSetup();
                  }}
                  className="w-full h-16 bg-[#004b37] text-white rounded-2xl font-bold shadow-xl shadow-emerald-900/20"
                >
                  Save and Complete
                </button>
              </div>
            </div>
          )}

          {/* EXIT CONFIRM */}
          {showExitConfirm && (
            <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-white rounded-[32px] p-8 w-full max-w-xs text-center animate-slide-up">
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                  Quit Setup?
                </h3>

                <p className="text-sm text-gray-500 mb-8">
                  Your progress won't be saved. Are you sure?
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowExitConfirm(false);
                      setShowWalkthrough(false);
                    }}
                    className="py-4 bg-red-50 text-red-600 rounded-2xl font-bold"
                  >
                    Yes, Quit
                  </button>

                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold"
                  >
                    Continue Setup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAYMENT PORTAL */}
      {showPaymentPortal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[32px] p-8 shadow-2xl animate-slide-up">

            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-extrabold text-gray-900">
                Payment Portal
              </h2>

              <button
                onClick={() => setShowPaymentPortal(false)}
                className="p-2 bg-gray-50 rounded-full"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 bg-gray-50 rounded-3xl p-3 border border-gray-100 mb-4 shadow-inner">
                <img
                  src={paymentDetails?.icon}
                  alt="Service"
                  className="w-full h-full object-contain"
                />
              </div>

              <h3 className="text-lg font-bold text-[#00654b]">
                {paymentDetails?.name}
              </h3>

              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                ID: {paymentDetails?.id}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-tighter">
                  Amount Due
                </span>

                <span className="text-xl font-black text-gray-900">
                  NPR {paymentDetails?.amount}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                className="py-4 rounded-2xl border-2 border-[#00654b] text-[#00654b] font-bold active:scale-95 transition-all"
                onClick={() => {
                  alert("Scheduled Successfully!");
                  setShowPaymentPortal(false);
                }}
              >
                Schedule
              </button>

              {/* UPDATED: Pay Now triggers confirmation + recurring prompt */}
              <button
                className="py-4 rounded-2xl bg-[#00654b] text-white font-bold shadow-lg shadow-[#00654b]/30 active:scale-95 transition-all"
                onClick={handlePayNow}
              >
                Pay Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: PAID CONFIRMATION TOAST */}
      {showPaidConfirmation && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center pointer-events-none">
          <div className="bg-[#00654b] text-white px-8 py-5 rounded-[28px] shadow-2xl flex items-center gap-4 animate-slide-up">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Icon name="check_circle" size={24} fill={1} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold opacity-70 uppercase tracking-widest">Payment Successful</p>
              <p className="text-base font-extrabold">Paid to {paidToName}</p>
            </div>
          </div>
        </div>
      )}

      {/* NEW: RECURRING PAYMENT PROMPT */}
      {showRecurringPrompt && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[32px] p-8 shadow-2xl animate-slide-up">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Icon name="autorenew" size={32} className="text-[#00654b]" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">
                Save as Recurring?
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Would you like to set up automatic payments for <span className="font-bold text-gray-800">{paidToName}</span> each semester? We'll notify you before each payment.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                className="w-full py-4 bg-[#00654b] text-white rounded-2xl font-bold shadow-lg shadow-[#00654b]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                onClick={() => {
                  alert("Recurring payment saved!");
                  setShowRecurringPrompt(false);
                }}
              >
                <Icon name="autorenew" size={20} />
                Yes, Set Up Auto-Pay
              </button>

              <button
                className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-all"
                onClick={() => setShowRecurringPrompt(false)}
              >
                No, Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: NEA INSUFFICIENT FUNDS ALERT */}
      {showNEAAlert && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[32px] p-8 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-gray-900">
                Payment Alert
              </h2>
              <button
                onClick={() => setShowNEAAlert(false)}
                className="p-2 bg-gray-50 rounded-full"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-6">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center overflow-hidden p-2 flex-shrink-0 border border-amber-100">
                <img src={neaImg} alt="NEA" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-amber-800">NEA Electricity</p>
                <p className="text-xs text-amber-700 font-medium leading-relaxed mt-0.5">
                  Scheduled payment failed — insufficient funds in your wallet.
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center mb-8">
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-tighter">Amount Due</span>
              <span className="text-lg font-black text-gray-900">NPR 2,450</span>
            </div>

            <div className="flex flex-col gap-3">
              <button
                className="w-full py-4 bg-[#00654b] text-white rounded-2xl font-bold shadow-lg shadow-[#00654b]/20 active:scale-95 transition-all"
                onClick={() => {
                  alert("Redirecting to top up & pay...");
                  setShowNEAAlert(false);
                }}
              >
                Pay Now
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  className="py-4 bg-red-50 text-red-600 rounded-2xl font-bold active:scale-95 transition-all"
                  onClick={() => {
                    alert("Schedule cancelled.");
                    setShowNEAAlert(false);
                  }}
                >
                  Cancel Schedule
                </button>

                <button
                  className="py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-all"
                  onClick={() => {
                    alert("We'll remind you later.");
                    setShowNEAAlert(false);
                  }}
                >
                  Remind Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL NOTIFICATION */}
      {showFullNotifications && (
        <Notification
          onClose={() => setShowFullNotifications(false)}
        />
      )}

      {/* MAIN DASHBOARD */}
      <div className={showWalkthrough ? "hidden" : "block"}>

        <header className="sticky top-0 z-50 flex justify-between items-center px-5 py-3 bg-white border-b border-gray-100 shadow-sm">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#92f6cf] overflow-hidden border-2 border-[#00654b]">
              <img
                src="https://i.pravatar.cc/100?img=12"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Good morning,
              </p>

              <h1 className="text-lg font-bold text-[#00654b]">
                Hi, Sansar
              </h1>
            </div>
          </div>

          <div className="flex gap-1 relative">
            <IconButton icon="search" />
            <IconButton
              icon="notifications"
              hasBadge
              onClick={handleBellClick}
            />

            {showDropdown && (
              <div className="absolute right-0 top-12 w-72 bg-white rounded-[32px] shadow-2xl border border-gray-100 z-[60] overflow-hidden animate-dropdown-reveal origin-top-right">

                <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-[#f7faf9]">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    Alerts
                  </span>

                  <button
                    onClick={() => {
                      setShowFullNotifications(true);
                      setShowDropdown(false);
                    }}
                    className="text-[10px] font-bold text-[#00654b] underline"
                  >
                    View All
                  </button>
                </div>

                <div className="min-h-[120px] max-h-80 overflow-y-auto">
                  {isSearchingNotifications ? (
                    <div className="p-10 flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-[#00654b] border-t-transparent rounded-full animate-spin"></div>

                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest animate-pulse">
                        Loading...
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-3">

                      {/* LBEF notification — unchanged */}
                      <div
                        onClick={openLBEFPayment}
                        className="flex items-center gap-4 p-4 bg-red-50 hover:bg-red-100 rounded-[24px] transition-all cursor-pointer border border-red-100 animate-stagger-1"
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white p-1">
                          <img
                            src={lbefImg}
                            alt="LBEF"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-red-700">
                            LBEF College
                          </p>

                          <p className="text-[11px] text-red-600 font-medium truncate">
                            You have 100k due
                          </p>
                        </div>

                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      </div>

                      {/* Vianet notification — unchanged */}
                      <div className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-[24px] transition-colors animate-stagger-2">

                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white p-1 border border-gray-100">
                          <img
                            src={vianetImg}
                            alt="Vianet"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800">
                            Vianet Fiber
                          </p>

                          <p className="text-[11px] text-gray-500 font-medium">
                            Monthly bill is due
                          </p>
                        </div>
                      </div>

                      {/* NEW: NEA insufficient funds notification */}
                      <div
                        onClick={openNEAAlert}
                        className="flex items-center gap-4 p-4 bg-amber-50 hover:bg-amber-100 rounded-[24px] transition-all cursor-pointer border border-amber-100 animate-stagger-3"
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white p-1 border border-amber-100">
                          <img
                            src={neaImg}
                            alt="NEA"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-amber-700">
                            NEA Electricity
                          </p>

                          <p className="text-[11px] text-amber-600 font-medium truncate">
                            Scheduled payment failed — low balance
                          </p>
                        </div>

                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="px-5 pt-4 space-y-6">

          <section className="relative bg-[#008060] rounded-2xl p-5 text-white overflow-hidden shadow-lg">

            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>

            <div className="flex justify-between items-start mb-6">

              <div>
                <p className="text-xs opacity-80 flex items-center gap-1">
                  NPR Balance
                  <Icon name="visibility" size={14} />
                </p>

                <p className="text-2xl font-extrabold mt-1">
                  NPR 12,450.75
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs opacity-80 flex items-center justify-end gap-1 font-bold">
                  <Icon
                    name="stars"
                    size={14}
                    className="text-yellow-400"
                    fill={1}
                  />
                  Fonepoints
                </p>

                <p className="text-lg font-bold text-yellow-400">
                  2,840.00
                </p>
              </div>
            </div>

            <div className="flex justify-between bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 active:bg-white/20 transition-all">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="account_balance_wallet" size={20} />
                Reward History
              </div>

              <Icon name="chevron_right" size={20} />
            </div>
          </section>

          <section className="grid grid-cols-4 gap-4">
            <QuickAction
              icon="add_circle"
              label="Load Money"
              fill={1}
            />

            <QuickAction
              icon="send_to_mobile"
              label="Send Money"
            />

            <QuickAction
              icon="account_balance"
              label="Bank Transfer"
            />

            <QuickAction
              icon="payments"
              label="Remittance"
            />
          </section>

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold">
                Upcoming Schedules
              </h2>

              <button
                onClick={() => navigate("/schedules")}
                className="text-[#00654b] text-sm font-bold hover:underline"
              >
                View All
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide">

              <ScheduleCard
                img={vianetImg}
                title="Vianet Fiber"
                subtitle="Due in 2 days"
                amount="NPR 1,750"
                bg="bg-red-50"
              />

              <ScheduleCard
                img={neaImg}
                title="NEA Electricity"
                subtitle="Due in 4 days"
                amount="NPR 2,450"
                bg="bg-blue-50"
              />
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold mb-4">
              Utility & Bill Payments
            </h2>

            {isLoadingUtilities ? (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm grid grid-cols-4 gap-y-8 animate-pulse">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>

                    <div className="w-12 h-2 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm grid grid-cols-4 gap-y-8 animate-fade-in">

                <UtilityItem icon="smartphone" label="Topup" />
                <UtilityItem icon="bolt" label="Electricity" />
                <UtilityItem icon="water_drop" label="Water" />
                <UtilityItem icon="wifi" label="Internet" />
                <UtilityItem icon="tv" label="Television" />
                <UtilityItem icon="flight" label="Airlines" />
                <UtilityItem icon="movie" label="Movies" />
                <UtilityItem icon="more_horiz" label="All" />
              </div>
            )}
          </section>

          <section className="pb-4">
            <div className="relative w-full h-32 rounded-3xl overflow-hidden shadow-sm group">
              <img
                alt="Promo"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                src="https://images.unsplash.com/photo-1616077168079-7e09a677fb2c?auto=format&fit=crop&q=80&w=800"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-[#00654b]/95 via-[#00654b]/70 to-transparent flex flex-col justify-center px-8">

                <span className="bg-white/20 w-fit px-2 py-0.5 rounded text-[10px] text-white font-bold mb-2 uppercase tracking-widest">
                  Limited Offer
                </span>

                <p className="text-white text-xl font-extrabold">
                  Flat 10% Cashback
                </p>

                <p className="text-white/80 text-xs font-medium">
                  On your first Vianet bill payment
                </p>
              </div>
            </div>
          </section>
        </main>

        <nav className="fixed bottom-0 left-0 w-full z-40 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] h-20 flex justify-around items-center px-2">

          <NavBtn
            onClick={() => navigate("/")}
            icon="home"
            label="Home"
            active={location.pathname === "/"}
          />

          <NavBtn
            icon="receipt_long"
            label="Statement"
          />

          <div className="relative -mt-10">
            <button className="w-16 h-16 bg-[#00654b] text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg active:scale-95 transition-all">
              <Icon name="qr_code_scanner" size={32} />
            </button>

            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#00654b] whitespace-nowrap">
              Scan & Pay
            </span>
          </div>

          <NavBtn
            onClick={() => navigate("/schedules")}
            icon="calendar_month"
            label="Schedules"
            active={location.pathname === "/schedules"}
          />

          <NavBtn
            icon="grid_view"
            label="More"
          />
        </nav>
      </div>
    </div>
  );
};

const IconButton = ({ icon, hasBadge, onClick }) => (
  <button
    onClick={onClick}
    className="p-2 hover:bg-gray-100 rounded-full relative transition-colors"
  >
    <Icon name={icon} className="text-gray-600" />

    {hasBadge && (
      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
    )}
  </button>
);

const QuickAction = ({ icon, label, fill = 0 }) => (
  <div className="flex flex-col items-center gap-2">
    <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm active:scale-90 transition-all">
      <Icon
        name={icon}
        size={28}
        className="text-[#00654b]"
        fill={fill}
      />
    </button>

    <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight uppercase tracking-tighter">
      {label}
    </span>
  </div>
);

const ScheduleCard = ({
  img,
  title,
  subtitle,
  amount,
  bg,
}) => (
  <div className="min-w-[240px] bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 active:scale-95 transition-transform">

    <div
      className={`w-14 h-14 ${bg} rounded-xl flex items-center justify-center overflow-hidden p-2 flex-shrink-0`}
    >
      <img
        src={img}
        alt={title}
        className="w-full h-full object-contain"
      />
    </div>

    <div className="overflow-hidden">
      <p className="text-[13px] font-bold text-gray-900 truncate">
        {title}
      </p>

      <p className="text-[11px] text-gray-500 font-medium">
        {subtitle}
      </p>

      <p className="text-sm font-extrabold text-[#00654b] mt-0.5">
        {amount}
      </p>
    </div>
  </div>
);

const UtilityItem = ({ icon, label }) => (
  <div className="flex flex-col items-center gap-2 active:opacity-60 transition-opacity">
    <Icon
      name={icon}
      size={26}
      className="text-gray-500"
    />

    <span className="text-[10px] font-bold text-gray-500 uppercase">
      {label}
    </span>
  </div>
);

const NavBtn = ({
  onClick,
  icon,
  label,
  active,
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center px-4 py-1 transition-all ${
      active ? "text-[#00654b]" : "text-gray-400"
    }`}
  >
    <Icon
      name={icon}
      fill={active ? 1 : 0}
    />

    <span className="text-[10px] font-bold mt-1 uppercase">
      {label}
    </span>
  </button>
);

export default Home;