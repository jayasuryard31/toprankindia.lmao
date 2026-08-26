const prisma = require("../../Config/DBConnect");

const addAndSave = async (a, b) => {
  const result = a + b;
  return prisma.calculation.create({ data: { a, b, result } });
};

const listCalculations = async () => {
  return prisma.calculation.findMany({ orderBy: { id: "desc" } });
};

module.exports = { addAndSave, listCalculations };
