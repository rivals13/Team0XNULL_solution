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

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", pin: "", confirmPin: "" });
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleRegister = (e) => {
    e.preventDefault();
    setError("");
    if (form.pin !== form.confirmPin) {
      setError("PINs do not match. Please try again.");
      return;
    }
    if (form.pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/");
    }, 1400);
  };

  const Field = ({ label, icon, children }) => (
    <div>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-4 py-3.5 bg-gray-50 focus-within:border-[#00654b] transition-colors">
        <Icon name={icon} size={18} className="text-gray-400" />
        {children}
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{ background: "#f7faf6", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap');`}</style>

      {/* Header */}
      <div
        className="flex flex-col items-center justify-center pt-12 pb-8 px-6"
        style={{ background: "linear-gradient(160deg,#00654b,#008a60)" }}
      >
        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-3">
          <span className="text-2xl font-extrabold" style={{ color: "#00654b" }}>e</span>
        </div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">Create Account</h1>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-base">🇳🇵</span>
          <span className="text-xs text-white/70 font-medium">Join Nepal's digital wallet</span>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col px-5 -mt-6 pb-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold mb-1" style={{ color: "#141b2b" }}>Register</h2>
          <p className="text-sm text-gray-500 mb-5">Fill in your details to get started</p>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {/* Full Name */}
            <Field label="Full Name" icon="person">
              <input
                type="text"
                placeholder="Sansar Chhetri"
                value={form.name}
                onChange={set("name")}
                className="flex-1 bg-transparent text-sm font-semibold outline-none"
                required
              />
            </Field>

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
                  value={form.phone}
                  onChange={set("phone")}
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
                Set PIN
              </label>
              <div className="flex items-center gap-2 border border-gray-200 rounded-2xl px-4 py-3.5 bg-gray-50 focus-within:border-[#00654b] transition-colors">
                <Icon name="lock" size={18} className="text-gray-400" />
                <input
                  type={showPin ? "text" : "password"}
                  placeholder="4–6 digit PIN"
                  value={form.pin}
                  onChange={set("pin")}
                  maxLength={6}
                  className="flex-1 bg-transparent text-sm font-semibold outline-none tracking-widest"
                  required
                />
                <button type="button" onClick={() => setShowPin(!showPin)}>
                  <Icon name={showPin ? "visibility_off" : "visibility"} size={18} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Confirm PIN */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Confirm PIN
              </label>
              <div className={`flex items-center gap-2 border rounded-2xl px-4 py-3.5 bg-gray-50 focus-within:border-[#00654b] transition-colors ${error ? "border-red-400" : "border-gray-200"}`}>
                <Icon name="lock_reset" size={18} className="text-gray-400" />
                <input
                  type={showPin ? "text" : "password"}
                  placeholder="Re-enter PIN"
                  value={form.confirmPin}
                  onChange={set("confirmPin")}
                  maxLength={6}
                  className="flex-1 bg-transparent text-sm font-semibold outline-none tracking-widest"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <Icon name="error" size={16} className="text-red-500" />
                <span className="text-xs text-red-600 font-semibold">{error}</span>
              </div>
            )}

            {/* Terms */}
            <p className="text-xs text-gray-400 text-center px-2">
              By registering you agree to eSewa's{" "}
              <span className="font-semibold" style={{ color: "#00654b" }}>Terms of Service</span>{" "}
              and{" "}
              <span className="font-semibold" style={{ color: "#00654b" }}>Privacy Policy</span>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-1"
              style={{ background: loading ? "#4caf50" : "#00654b" }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  <Icon name="how_to_reg" size={20} className="text-white" />
                  Create Account
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have an account?{" "}
          <Link to="/login" className="font-bold" style={{ color: "#00654b" }}>
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
