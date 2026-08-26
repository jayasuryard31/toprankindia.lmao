const CATEGORIES = {
  1: { id: 1, name: "AI Agents & Infrastructure" },
  2: { id: 2, name: "SEO & AI Visibility" },
  3: { id: 3, name: "Marketing & Advertising" },
  4: { id: 4, name: "Content & Copywriting" },
  5: { id: 5, name: "Image & Video Generation" },
  6: { id: 6, name: "Productivity & Automation" },
  7: { id: 7, name: "Code & Development" },
  8: { id: 8, name: "Data & Analytics" },
  9: { id: 9, name: "Customer Support" },
  10: { id: 10, name: "Education & Learning" },
  11: { id: 11, name: "Finance & Accounting" },
  12: { id: 12, name: "Design & Creative" },
  13: { id: 13, name: "HR & Recruitment" },
  14: { id: 14, name: "Sales & CRM" },
  15: { id: 15, name: "Other" },
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
