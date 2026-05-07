import React from "react";
import { AiOutlineSearch, AiOutlineBell, AiOutlineEye } from "react-icons/ai";
import { BsQuestionCircle } from "react-icons/bs";
import { FaPlus, FaUniversity } from "react-icons/fa";
import { MdSend } from "react-icons/md";
import { RiRefund2Line } from "react-icons/ri";
import { IoPhonePortraitOutline } from "react-icons/io5";
import { FiTv } from "react-icons/fi";
import { MdStars } from "react-icons/md";
import { CiWallet } from "react-icons/ci";
import { IoIosArrowForward } from "react-icons/io";
const Home = () => {
  return (
    <div className="bg-[#F3F4F6] min-h-screen pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-center px-4 pt-4">
        <div>
          <p className="text-sm text-gray-500">Good morning,</p>
          <h1 className="text-xl font-semibold">Hi, Sansar</h1>
        </div>

        <div className="flex gap-4 text-xl text-gray-600">
          <AiOutlineSearch />
          <AiOutlineBell />
          <BsQuestionCircle />
        </div>
      </div>

      {/* BALANCE CARD */}
      <div className="mx-4 mt-4 bg-emerald-700 text-white rounded-2xl p-5 relative shadow-lg">
        <div className="flex items-center gap-2 text-sm opacity-80">
          <AiOutlineEye />
          <span>NPR Balance</span>
        </div>

        <h2 className="text-3xl font-bold mt-1">NPR 12,450.75</h2>

        <div className="absolute right-4 top-5 text-right">
          <p className="text-xl flex items-center gap-1">
            <MdStars className="text-yellow-400" />
            Fonepoints
          </p>
          <p className="text-xl font-semibold text-yellow-400 ">2,840.00</p>
        </div>

        <button
          className="mt-10 w-full text-start px-4 py-3 rounded-lg text-[18px] text-white 
bg-white/20 backdrop-blur-xl border border-white/20 
  transition items-center  gap-2 flex"
        >
          <CiWallet className="text-xl" /> Reward History <IoIosArrowForward className="text-lg ml-auto" />
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
          <h2 className="font-semibold">Upcoming schedules</h2>
          <span className="text-emerald-700 text-sm font-medium">View All</span>
        </div>

        <div className="bg-white mt-3 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <p className="font-semibold">3 Bills Due Soon</p>
            <p className="text-emerald-700 font-semibold">NPR 4,200</p>
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
        <h2 className="font-semibold mb-3">Utility & Bill Payments</h2>

        <div className="bg-white rounded-xl p-4 grid grid-cols-4 gap-4">
          <Service icon={<IoPhonePortraitOutline />} label="Topup" />
          <Service icon={<FiTv />} label="Electricity" />
          <Service icon={<FaPlus />} label="Water" />
          <Service icon={<FaPlus />} label="Internet" />

          <Service icon={<FaPlus />} label="Television" />
          <Service icon={<FaPlus />} label="Airlines" />
          <Service icon={<FaPlus />} label="Movies" />
          <Service icon={<FaPlus />} label="All Services" />
        </div>
      </div>
    </div>
  );
};

/* COMPONENTS */

const Action = ({ icon, label }) => (
  <div className="flex flex-col items-center text-xs text-gray-700">
    <div className="bg-white p-3 rounded-xl shadow-md text-xl">{icon}</div>
    <p className="mt-2 text-center">{label}</p>
  </div>
);

const BillCard = ({ title, time, amount }) => (
  <div className="bg-gray-50 rounded-lg p-3 w-full">
    <p className="text-sm font-medium">{title}</p>
    <p className="text-xs text-gray-500">{time}</p>
    <p className="text-sm font-semibold mt-1">{amount}</p>
  </div>
);

const Service = ({ icon, label }) => (
  <div className="flex flex-col items-center text-xs text-gray-700">
    <div className="text-xl">{icon}</div>
    <p className="mt-1">{label}</p>
  </div>
);

export default Home;
