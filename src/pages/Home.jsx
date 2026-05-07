
import React, { useEffect, useState } from "react";
import { AiOutlineSearch, AiOutlineBell, AiOutlineEye } from "react-icons/ai";
import { BsQuestionCircle } from "react-icons/bs";
import { FaPlus, FaUniversity } from "react-icons/fa";
import { MdSend, MdStars } from "react-icons/md";
import { RiRefund2Line } from "react-icons/ri";
import { IoPhonePortraitOutline } from "react-icons/io5";
import { FiTv, FiX } from "react-icons/fi";
import { CiWallet } from "react-icons/ci";
import { IoIosArrowForward } from "react-icons/io";

const Home = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  // 🔥 NEW: loading state for notification content delay
  const [loading, setLoading] = useState(false);

  // SHOW POPUP ONLY ONE TIME
  useEffect(() => {
    const popupShown = sessionStorage.getItem("homePopup");

    if (!popupShown) {
      sessionStorage.setItem("homePopup", "shown");

      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  // 🔔 FIXED: instant open + delayed content
  const handleNotificationClick = () => {
    setShowNotification(true);  // open instantly
    setLoading(true);           // start loading

    setTimeout(() => {
      setLoading(false);        // show content after 2s
    }, 2000);
  };

  return (
    <div className="bg-[#F3F4F6] min-h-screen pb-10 relative">
      {/* HEADER */}
      <div className="flex justify-between items-center px-4 pt-4">
        <div>
          <p className="text-sm text-gray-500">Good morning,</p>
          <h1 className="text-xl font-semibold">Hi, Sansar</h1>
        </div>

        <div className="flex gap-4 text-xl text-gray-600 items-center">
          <AiOutlineSearch className="cursor-pointer" />

          {/* NOTIFICATION */}
          <div className="relative">
            <AiOutlineBell
              className="cursor-pointer"
              onClick={handleNotificationClick}
            />

            {/* RED DOT */}
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>

            {/* NOTIFICATION BOX */}
            {showNotification && (
              <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl p-4 z-50">
                
                {/* TOP */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-lg">
                    Notifications
                  </h2>

                  <button
                    onClick={() =>
                      setShowNotification(false)
                    }
                  >
                    <FiX />
                  </button>
                </div>
                {/* 🔥 LOADING (2 sec delay content) */}
                {loading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>

                    <div className="h-4 bg-gray-200 rounded w-2/3 mt-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-4/5"></div>

                    <div className="h-4 bg-gray-200 rounded w-3/5 mt-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                  </div>
                ) : (
                  <>  

                {/* ITEM */}
                <div className="border-b pb-3 mb-3">
                  <p className="font-medium text-sm">
                    Vianet bill due soon
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Your internet bill is due in 2 days.
                  </p>
                </div>

                {/* ITEM */}
                <div className="border-b pb-3 mb-3">
                  <p className="font-medium text-sm">
                    Cashback received
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    You received NPR 120 cashback.
                  </p>
                </div>

                {/* ITEM */}
                <div>
                  <p className="font-medium text-sm">
                    Payment successful
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Electricity bill paid successfully.
                  </p>
                </div>
                </>
                )}
              </div>
            )}
          </div>

          <BsQuestionCircle className="cursor-pointer" />
        </div>
      </div>

      {/* BALANCE CARD */}
      <div className="mx-4 mt-4 bg-emerald-700 text-white rounded-2xl p-5 relative shadow-lg">
        <div className="flex items-center gap-2 text-sm opacity-80">
          <AiOutlineEye />
          <span>NPR Balance</span>
        </div>

        <h2 className="text-3xl font-bold mt-1">
          NPR 12,450.75
        </h2>

        <div className="absolute right-4 top-5 text-right">
          <p className="text-xl flex items-center gap-1">
            <MdStars className="text-yellow-400" />
            Fonepoints
          </p>

          <p className="text-xl font-semibold text-yellow-400">
            2,840.00
          </p>
        </div>

        <button
          className="mt-10 w-full text-start px-4 py-3 rounded-lg text-[18px] text-white 
          bg-white/20 backdrop-blur-xl border border-white/20 
          transition items-center gap-2 flex"
        >
          <CiWallet className="text-xl" />
          Reward History
          <IoIosArrowForward className="text-lg ml-auto" />
        </button>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-4 gap-4 px-4 mt-12">
        <Action icon={<FaPlus />} label="Load Money" />
        <Action icon={<MdSend />} label="Send Money" />
        <Action icon={<FaUniversity />} label="Bank Transfer" />
        <Action icon={<RiRefund2Line />} label="Remittance" />
      </div>

      {/* UPCOMING SCHEDULE */}
      <div className="px-4 mt-6">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">
            Upcoming schedules
          </h2>

          <span className="text-emerald-700 mr-5 text-sm font-medium">
            View All
          </span>
        </div>

        <div className="bg-white mt-3 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <p className="font-semibold">
              3 Bills Due Soon
            </p>

            <p className="text-emerald-700 font-semibold">
              NPR 4,200
            </p>
          </div>

          <div className="flex gap-3">
            <BillCard
              title="Vianet Fiber"
              time="In 2 days"
              amount="NPR 1,750"
            />

            <BillCard
              title="NEA Electricity"
              time="In 4 days"
              amount="NPR 2,450"
            />
          </div>
        </div>
      </div>

      {/* SERVICES */}
      <div className="px-4 mt-6">
        <h2 className="font-semibold mb-3">
          Utility & Bill Payments
        </h2>

        <div className="bg-white rounded-xl p-4 grid grid-cols-4 gap-4">
          <Service
            icon={<IoPhonePortraitOutline />}
            label="Topup"
          />

          <Service
            icon={<FiTv />}
            label="Electricity"
          />

          <Service icon={<FaPlus />} label="Water" />
          <Service icon={<FaPlus />} label="Internet" />
          <Service icon={<FaPlus />} label="Television" />
          <Service icon={<FaPlus />} label="Airlines" />
          <Service icon={<FaPlus />} label="Movies" />
          <Service icon={<FaPlus />} label="All Services" />
        </div>
      </div>

      {/* POPUP */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-[#EEF7F3] w-full max-w-2xl rounded-3xl p-6 relative animate-popup">
            
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 bg-white shadow-md p-2 rounded-full"
            >
              <FiX className="text-xl" />
            </button>

            {/* TOP */}
            <div className="flex items-center gap-3 mb-5">
              <span className="bg-emerald-700 text-white text-xs px-3 py-1 rounded-full font-semibold">
                NEW
              </span>

              <h2 className="text-emerald-700 text-2xl font-semibold">
                Automation Alert
              </h2>
            </div>

            {/* CONTENT */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800">
                  Automate Vianet payments?
                </h3>

                <p className="text-gray-500 mt-2 text-lg">
                  You pay NPR 1,000 every month. Set up auto-pay
                  to avoid service interruptions.
                </p>
              </div>

              <div className="bg-emerald-100 p-4 rounded-full text-2xl">
                ✨
              </div>
            </div>

            {/* BUTTONS */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <button className="bg-emerald-700 text-white py-4 rounded-2xl text-xl font-medium hover:bg-emerald-800 transition">
                Set Up
              </button>

              <button
                onClick={() => setShowPopup(false)}
                className="bg-white border border-gray-300 text-gray-700 py-4 rounded-2xl text-xl font-medium hover:bg-gray-100 transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ACTION COMPONENT */

const Action = ({ icon, label }) => (
  <div className="flex flex-col items-center text-xs text-gray-700">
    <div className="bg-white p-3 rounded-xl shadow-md text-xl">
      {icon}
    </div>

    <p className="mt-2 text-center">{label}</p>
  </div>
);

/* BILL CARD */

const BillCard = ({ title, time, amount }) => (
  <div className="bg-gray-50 rounded-lg p-3 w-full">
    <p className="text-sm font-medium">{title}</p>

    <p className="text-xs text-gray-500">{time}</p>

    <p className="text-sm font-semibold mt-1">{amount}</p>
  </div>
);

/* SERVICE */

const Service = ({ icon, label }) => (
  <div className="flex flex-col items-center text-xs text-gray-700">
    <div className="text-xl">{icon}</div>

    <p className="mt-1">{label}</p>
  </div>
);

export default Home;