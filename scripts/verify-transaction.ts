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
      const doc = await TxTestModel.create([{ value: "probe" }], { session });
      await TxTestModel.findById(doc[0]._id, null, { session });
      await TxTestModel.deleteOne({ _id: doc[0]._id }, { session });
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
