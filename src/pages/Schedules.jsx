import React, { useState, useEffect } from "react";
import {
  FiMenu,
  FiPlus,
  FiEdit,
  FiBell,
  FiCreditCard,
  FiChevronLeft,
  FiChevronRight,
  FiX,
} from "react-icons/fi";

import { IoFlashOutline } from "react-icons/io5";
import { MdWifi, MdOutlineHomeWork } from "react-icons/md";
import { AiOutlineBarChart } from "react-icons/ai";

const Schedules = () => {
  // =========================
  // NEW SCHEDULE SUGGESTION
  // =========================
  const newScheduleData = {
    icon: <MdWifi />,
    biller: "Vianet",
    avgAmount: 1050,
    window: "First week",
  };

  // Whether there is fresh/new schedule to show on first load
  const hasNewSchedule = true; // ← replace with real logic (API/context) later

  // =========================
  // STATE
  // =========================
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);

  const [autoPayAmount, setAutoPayAmount] = useState(1050);
  const [isNotifyEnabled, setIsNotifyEnabled] = useState(false);
  const [isAutoDeductEnabled, setIsAutoDeductEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(5);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState(1050);

  const [autoOpened, setAutoOpened] = useState(false);

  // =========================
  // ON FIRST LOAD: OPEN MODAL IF NEW DATA (ONCE ONLY)
  // =========================
  useEffect(() => {
    if (hasNewSchedule && !showModal && !autoOpened) {
      setShowModal(true);
      setStep(1);
      setAutoOpened(true);

      // Auto‑close modal after 2 seconds if auto‑opened
      const timer = setTimeout(() => {
        setShowModal(false);
        setStep(1);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [hasNewSchedule, showModal, autoOpened]);

  // =========================
  // CLOSE MODAL
  // =========================
  const closeModal = () => {
    setShowModal(false);
    setStep(1);
    setIsEditingAmount(false);
  };

  // =========================
  // CONFIRM
  // =========================
  const handleConfirm = () => {
    console.log("Submitting Schedule:", {
      amount: autoPayAmount,
      notify: isNotifyEnabled,
      autoDeduct: isAutoDeductEnabled,
      date: selectedDate,
    });

    alert(`✅ Schedule for NPR ${autoPayAmount.toLocaleString()} finalized successfully!`);

    // Close modal after 2 seconds when user confirms
    setTimeout(() => {
      closeModal();
    }, 1000);
  };

  // =========================
  // HANDLE AMOUNT EDIT
  // =========================
  const startEditingAmount = () => {
    setTempAmount(autoPayAmount);
    setIsEditingAmount(true);
  };

  const saveAmount = () => {
    const numValue = parseInt(tempAmount);
    if (!isNaN(numValue) && numValue > 0) {
      setAutoPayAmount(numValue);
      setIsEditingAmount(false);
    } else {
      alert("Please enter a valid amount");
    }
  };

  const cancelEdit = () => {
    setIsEditingAmount(false);
    setTempAmount(autoPayAmount);
  };

  // =========================
  // TOGGLE CHECKBOXES
  // =========================
  const toggleNotify = () => {
    setIsNotifyEnabled(prev => !prev);
  };

  const toggleAutoDeduct = () => {
    setIsAutoDeductEnabled(prev => !prev);
  };

  // =========================
  // CARD ITEM
  // =========================
  const ScheduleItem = ({
    icon,
    title,
    subtitle,
    amount,
    status,
  }) => (
    <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 flex justify-between items-center border border-gray-50">
      <div className="flex gap-4 items-center">
        <div className="bg-gray-100 p-3 rounded-xl text-xl text-gray-700">
          {icon}
        </div>

        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="text-right mt-20">
        <p className="font-bold text-gray-900">{amount}</p>
        <p
          className={`text-[10px] font-bold mt-1  tracking-wider ${
            status === "ACTIVE"
              ? "text-green-600"
              : "text-gray-400"
          }`}
        >
          ● {status}
        </p>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-8 font-sans text-gray-900">
      {/* ========================= */}
      {/* HEADER */}
      {/* ========================= */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm cursor-pointer">
            <FiMenu className="text-xl text-gray-600" />
          </div>
          <h1 className="text-xl font-black text-green-700 tracking-tight">
            PaySmart
          </h1>
        </div>
        <div className="w-10 h-10 bg-gray-200 rounded-full border-2 border-white shadow-sm" />
      </div>

      {/* ========================= */}
      {/* TITLE */}
      {/* ========================= */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight">
            Schedules
          </h2>
          <p className="text-gray-500 font-medium">
            Manage your recurring payments
          </p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            setStep(1);
          }}
          className="flex items-center gap-2 bg-green-700 hover:bg-green-800 transition-colors text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-green-200"
        >
          <FiPlus strokeWidth={3} />
          Add New
        </button>
      </div>

      {/* ========================= */}
      {/* TABS */}
      {/* ========================= */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-1 no-scrollbar">
        {["All", "Active", "Paused", "Completed"].map(
          (tab, i) => (
            <button
              key={i}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                i === 0
                  ? "bg-green-700 text-white shadow-md shadow-green-100"
                  : "bg-white border border-gray-100 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* ========================= */}
      {/* FEATURE CARD */}
      {/* ========================= */}
      <div className="bg-white rounded-4xl p-6 shadow-xl shadow-gray-200/50 mb-6 border border-gray-50 relative overflow-hidden">
        <div className="flex justify-between items-start relative z-10">
          <div className="flex gap-5">
            <div className="bg-green-100 p-4 rounded-2xl text-green-700 text-2xl">
              <IoFlashOutline />
            </div>
            <div>
              <h3 className="text-xl font-extrabold">
                Electricity Bill
              </h3>
              <p className="text-sm text-gray-400 font-medium">
                NEA - Kathmandu North
              </p>
              <div className="mt-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Current Amount
                </p>
                <p className="text-3xl font-black text-gray-900">
                  Rs. 4,250
                </p>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-black bg-green-100 text-green-700 px-3 py-1.5 rounded-full tracking-wider uppercase">
            Upcoming • 2 Days
          </span>
        </div>
        <button className="absolute bottom-6 right-6 bg-gray-50 hover:bg-gray-100 p-3 rounded-full transition-colors">
          <FiEdit className="text-gray-400" />
        </button>
      </div>

      {/* ========================= */}
      {/* LIST */}
      {/* ========================= */}
      <div className="space-y-1">
        <ScheduleItem
          icon={<MdWifi />}
          title="Home Internet"
          subtitle="Monthly • 15th of month"
          amount="Rs. 1,500"
          status="ACTIVE"
        />
        <ScheduleItem
          icon={<MdOutlineHomeWork />}
          title="Office Rent"
          subtitle="Monthly • 1st of month"
          amount="Rs. 25,000"
          status="PAUSED"
        />
      </div>

      {/* ========================= */}
      {/* SUMMARY */}
      {/* ========================= */}
      <div className="bg-green-900 text-white rounded-4xl p-7 my-8 flex justify-between items-center shadow-2xl shadow-green-900/20 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-bold opacity-60 uppercase tracking-widest mb-1">
            Total Monthly Commit
          </p>
          <h2 className="text-3xl font-black">
            Rs. 30,750
          </h2>
        </div>
        <AiOutlineBarChart className="text-5xl opacity-20 absolute -right-2 -bottom-2 rotate-12" />
        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
          <AiOutlineBarChart className="text-2xl" />
        </div>
      </div>

      {/* ========================= */}
      {/* MODAL */}
      {/* ========================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-[40px] md:rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[95vh] flex flex-col relative">
            {/* CLOSE BUTTON */}
            <button
  onClick={closeModal}
  className="absolute top-8 right-5 md:top-5 cursor-pointer z-999 bg-gray-100  hover:bg-gray-200 p-2 rounded-full transition-all"
>
              <FiX className="text-sm text-gray-700" />
            </button>

            {/* ========================= */}
            {/* PROGRESS */}
            {/* ========================= */}
            {step < 3 && (
              <div className="px-8 pt-14">
                <div className="flex justify-between text-[10px] mb-2 font-black text-gray-400 uppercase tracking-widest">
                  <span>Step {step} of 3</span>
                  <span > {Math.round((step / 3) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full  bg-green-600 transition-all duration-500 ease-out"
                    style={{
                      width: `${(step / 3) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* ========================= */}
            {/* MODAL CONTENT */}
            {/* ========================= */}
            <div className="flex-1 overflow-y-auto">
              {/* ========================= */}
              {/* STEP 1 */}
              {/* ========================= */}
              {step === 1 && (
                <div className="p-8">
                  <div className="bg-linear-to-b from-green-50 to-white h-48 rounded-4xl flex items-center justify-center mb-8 border border-green-50">
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-green-100">
                      <AiOutlineBarChart className="text-green-700 text-4xl" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-black mb-2">
                    We spotted a pattern! ✨
                  </h2>
                  <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                    We've identified a consistent monthly transaction that could be automated to save you time.
                  </p>
                  <div className="bg-gray-50 p-6 rounded-4xl mb-8 border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-white p-3 rounded-2xl shadow-sm">
                        {newScheduleData.icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Biller
                        </p>
                        <h3 className="font-bold text-xl">
                          {newScheduleData.biller}
                        </h3>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="bg-white rounded-2xl p-4 flex-1 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase">
                          Avg Amount
                        </p>
                        <p className="font-bold text-gray-900">
                          NPR {newScheduleData.avgAmount}
                        </p>
                      </div>
                      <div className="bg-white rounded-2xl p-4 flex-1 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase">
                          Window
                        </p>
                        <p className="font-bold text-gray-900">
                          {newScheduleData.window}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-100 mb-3"
                  >
                    Yes, Automate This
                  </button>
                  <button
                    onClick={closeModal}
                    className="w-full py-4 text-gray-400 font-bold"
                  >
                    Not Now
                  </button>
                </div>
              )}

              {/* ========================= */}
              {/* STEP 2 */}
              {/* ========================= */}
              {step === 2 && (
                <div className="p-8">
                  <h2 className="text-2xl font-black mb-2 text-gray-900">
                    When do you pay?
                  </h2>
                  <p className="text-gray-500 font-medium mb-8">
                    We've highlighted your usual window.
                  </p>
                  <div className="mb-8 bg-white border border-gray-100 p-4 rounded-4xl">
                    <div className="flex justify-between items-center mb-6 px-2">
                      <h3 className="font-black text-sm tracking-widest text-gray-400 uppercase">
                        October 2023
                      </h3>
                      <div className="flex gap-2">
                        <button className="p-2 bg-gray-50 rounded-full">
                          <FiChevronLeft />
                        </button>
                        <button className="p-2 bg-gray-50 rounded-full">
                          <FiChevronRight />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {Array.from({ length: 31 }, (_, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedDate(i + 1)}
                          className={`py-3 text-sm font-bold rounded-xl cursor-pointer transition-all ${
                            selectedDate === i + 1
                              ? "bg-green-700 text-white shadow-md scale-110"
                              : "text-gray-400 hover:bg-gray-100"
                          }`}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    className="w-full bg-green-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg"
                  >
                    Looks good, Next
                  </button>
                </div>
              )}

              {/* ========================= */}
              {/* STEP 3 - FIXED */}
              {/* ========================= */}
              {step === 3 && (
                <div className="flex flex-col h-full bg-gray-50">
                  <div className="flex-1 overflow-y-auto px-8 pt-8 pb-6">
                    <h2 className="text-3xl font-black text-gray-900 mt-6 leading-snug">
                      Set your auto-pay limit
                    </h2>
                    <p className="text-gray-500 mt-2 font-medium">
                      You can change this anytime later
                    </p>

                    <div className="mt-6 bg-white rounded-[36px] shadow-xl border border-gray-100 p-8 text-center">
                      <p className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase mb-6">
                        Monthly Limit
                      </p>

                      {/* FIXED AMOUNT EDITOR */}
                      <div className="flex justify-center items-end gap-3 mb-6 relative">
                        <span className="text-2xl font-bold text-gray-400 mb-2">
                          NPR
                        </span>
                        
                        {isEditingAmount ? (
                          <>
                            <input
                              type="number"
                              value={tempAmount}
                              onChange={(e) => setTempAmount(e.target.value)}
                              className="text-6xl font-black text-gray-900 tracking-tight bg-transparent outline-none w-48 text-center"
                              autoFocus
                            />
                            <div className="absolute -bottom-8 right-0 flex gap-2">
                              <button
                                onClick={saveAmount}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded-full font-bold hover:bg-green-700"
                              >
                                ✓ Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded-full font-bold hover:bg-gray-400"
                              >
                                ✕ Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="text-6xl font-black text-gray-900 tracking-tight">
                              {autoPayAmount.toLocaleString()}
                            </span>
                            <FiEdit
                              className="text-gray-300 text-xl mb-3 cursor-pointer hover:text-green-600 transition-colors"
                              onClick={startEditingAmount}
                            />
                          </>
                        )}
                      </div>

                      {/* FIXED INFO SECTION */}
                      <div className="text-left space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                          <span className="text-gray-500 font-medium">
                            Scheduled Date
                          </span>
                          <span className="font-bold text-gray-900">
                            {selectedDate}th of month
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                          <span className="text-gray-500 font-medium">
                            Provider
                          </span>
                          <span className="font-bold text-gray-900">
                            Vianet
                          </span>
                        </div>

                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                          <span className="text-gray-500 font-medium">
                            Notify Me
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={isNotifyEnabled}
                              onChange={toggleNotify}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-checked:bg-green-600 peer-focus:ring-4 peer-focus:ring-green-300/50 transition-all duration-300 rounded-full relative" />
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${isNotifyEnabled ? 'translate-x-6' : ''}`} />
                          </label>
                        </div>

                        <div className="flex justify-between items-center py-3">
                          <span className="text-gray-500 font-medium">
                            Auto-Deduct
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={isAutoDeductEnabled}
                              onChange={toggleAutoDeduct}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-checked:bg-green-600 peer-focus:ring-4 peer-focus:ring-green-300/50 transition-all duration-300 rounded-full relative" />
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${isAutoDeductEnabled ? 'translate-x-6' : ''}`} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirm}
                    className="w-auto bg-green-700 hover:bg-green-800 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-100 mx-8 mb-8 transition-all duration-200"
                  >
                    Confirm Schedule
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedules;