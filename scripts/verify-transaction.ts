import mongoose from "mongoose";

const MONGODB_URI =
  process.env["MONGODB_URI"] ?? "mongodb://127.0.0.1:27017/verify_tx?replicaSet=rs0";

const txTestSchema = new mongoose.Schema({
  value: { type: String, required: true },
});

const TxTestModel = mongoose.model("TxTest", txTestSchema);

async function run(): Promise<void> {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  const session = await mongoose.connection.startSession();
  try {
    await session.withTransaction(async () => {
      const [created] = await TxTestModel.create([{ value: "probe" }], { session });
      if (created === undefined) throw new Error("Transaction probe: create returned empty array");
      await TxTestModel.findById(created._id, null, { session });
      await TxTestModel.deleteOne({ _id: created._id }, { session });
    });
  } finally {
    await session.endSession();
  }

  await mongoose.connection.dropCollection("txtests").catch(() => {
    // collection may not exist if transaction rolled back
  });

  await mongoose.disconnect();

  console.log("TRANSACTION VERIFIED: replica set rs0 supports multi-document transactions");
}

run().catch((err: unknown) => {
  console.error("Transaction verification FAILED:", err);
  process.exit(1);
});
