import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

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

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/");
    }, 1200);
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{ background: "#f7faf6", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');`}</style>

      {/* Top green header */}
      <div
        className="flex flex-col items-center justify-center pt-16 pb-10 px-6"
        style={{ background: "linear-gradient(160deg,#00654b,#008a60)" }}
      >
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-4">
          <span className="text-3xl font-extrabold" style={{ color: "#00654b" }}>e</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">eSewa Nepal</h1>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-lg">🇳🇵</span>
          <span className="text-xs text-white/70 font-medium">Nepal's trusted digital wallet</span>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col px-5 -mt-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold mb-1" style={{ color: "#141b2b" }}>Welcome back!</h2>
          <p className="text-sm text-gray-500 mb-6">Login to your eSewa account</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-4 py-3.5 bg-gray-50 focus-within:border-[#00654b] transition-colors">
                <span className="text-sm font-semibold text-gray-500">+977</span>
                <div className="w-px h-4 bg-gray-300" />
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                  className="flex-1 bg-transparent text-sm font-semibold outline-none"
                  required
                />
                <Icon name="phone" size={18} className="text-gray-400" />
              </div>
            </div>

            {/* PIN */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                PIN
              </label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-4 py-3.5 bg-gray-50 focus-within:border-[#00654b] transition-colors">
                <Icon name="lock" size={18} className="text-gray-400" />
                <input
                  type={showPin ? "text" : "password"}
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  className="flex-1 bg-transparent text-sm font-semibold outline-none tracking-widest"
                  required
                />
                <button type="button" onClick={() => setShowPin(!showPin)}>
                  <Icon name={showPin ? "visibility_off" : "visibility"} size={18} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-xs font-semibold" style={{ color: "#00654b" }}>
                Forgot PIN?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
              style={{ background: loading ? "#4caf50" : "#00654b" }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Logging in…
                </>
              ) : (
                <>
                  <span className="text-lg">🇳🇵</span>
                  Login with eSewa
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Quick demo login */}
          <button
            onClick={() => navigate("/")}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm border border-gray-200 bg-gray-50 text-gray-600 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Icon name="bolt" size={18} className="text-yellow-500" />
            Demo Login (skip auth)
          </button>
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-gray-500 mt-6 mb-8">
          Don't have an account?{" "}
          <Link to="/register" className="font-bold" style={{ color: "#00654b" }}>
            Register here
          </Link>
        </p>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mb-8">
          Protected by Nepal Rastra Bank regulations 🔒
        </p>
      </div>
    </div>
  );
}
