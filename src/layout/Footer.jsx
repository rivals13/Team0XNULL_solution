import React from "react";
import { AiOutlineHome } from "react-icons/ai";
import { HiOutlineDocumentText } from "react-icons/hi";
import { IoQrCode } from "react-icons/io5";
import { FiCalendar } from "react-icons/fi";
import { BsGrid } from "react-icons/bs";
import { Link, useLocation } from "react-router-dom";

const Footer = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-100 border-t border-gray-300 shadow-lg">
      <div className="flex justify-around items-center py-3 relative">

        {/* Home */}
        <Link to="/" className="flex flex-col items-center">
          <NavItem
            icon={<AiOutlineHome />}
            label="Home"
            active={isActive("/")}
          />
        </Link>

        {/* Statement */}
        <Link to="/statement" className="flex flex-col items-center">
          <NavItem
            icon={<HiOutlineDocumentText />}
            label="Statement"
            active={isActive("/statement")}
          />
        </Link>

        {/* Scan Button */}
        <div className="absolute -top-6 flex flex-col items-center">
          <div className="bg-green-700 p-4 rounded-full shadow-lg border-4 border-white">
            <IoQrCode size={26} className="text-white" />
          </div>
          <span className="text-xs mt-1 font-medium text-gray-700">
            Scan & Pay
          </span>
        </div>

        {/* Schedules */}
        <Link to="/schedules" className="flex flex-col items-center">
          <NavItem
            icon={<FiCalendar />}
            label="Schedules"
            active={isActive("/schedules")}
          />
        </Link>

        {/* More */}
        <Link to="/more" className="flex flex-col items-center">
          <NavItem
            icon={<BsGrid />}
            label="More"
            active={isActive("/more")}
          />
        </Link>

      </div>
    </div>
  );
};

function NavItem({ icon, label, active }) {
  return (
    <div className="flex flex-col items-center cursor-pointer">
      
      {/* ICON */}
      <div
        className={`transition-all duration-300 ease-in-out transform ${
          active
            ? "text-green-700 scale-125"
            : "text-gray-500 scale-100"
        }`}
      >
        {React.cloneElement(icon, { size: 22 })}
      </div>

      {/* LABEL */}
      <span
        className={`mt-1 text-xs transition-all duration-300 ${
          active
            ? "text-green-700 font-semibold"
            : "text-gray-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default Footer;