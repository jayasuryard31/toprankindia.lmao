const CATEGORIES = {
  1: { id: 1, name: "AI & Machine Learning" },
  2: { id: 2, name: "SEO & Growth Engines" },
  3: { id: 3, name: "Global Marketing & AdTech" },
  4: { id: 4, name: "Content & Copywriting" },
  5: { id: 5, name: "Creative Media & Video AI" },
  6: { id: 6, name: "Productivity & Automation" },
  7: { id: 7, name: "Dev Tools & Cloud Infrastructure" },
  8: { id: 8, name: "Data & Business Intelligence" },
  9: { id: 9, name: "Customer Experience & Support" },
  10: { id: 10, name: "EdTech & Global Learning" },
  11: { id: 11, name: "FinTech, Banking & Web3" },
  12: { id: 12, name: "Design, 3D & UI/UX" },
  13: { id: 13, name: "HR, Talent & Remote Work" },
  14: { id: 14, name: "Sales & CRM Platforms" },
  15: { id: 15, name: "E-Commerce & Global Retail" },
  16: { id: 16, name: "HealthTech & BioTech" },
  17: { id: 17, name: "Mobile & App Ecosystems" },
  18: { id: 18, name: "Startups & Future Innovations" },
};

const PAYMENT_STATUS = {
  CREATED: "CREATED",
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

const CURRENCY = "INR";

const TIMEZONE = "Asia/Kolkata";

module.exports = { CATEGORIES, PAYMENT_STATUS, CURRENCY, TIMEZONE };
