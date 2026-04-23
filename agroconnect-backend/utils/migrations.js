import mongoose from "mongoose";
import Admin from "../models/Admin.js";
import CustomMandi from "../models/CustomMandi.js";

/**
 * PRODUCTION-SAFE MIGRATION
 * 1. Safely drops old unique index (without ownerId)
 * 2. Maps legacy addedBy (email) to ownerId (ObjectId)
 * 3. Ensures data integrity for multi-admin isolation
 */
export const runAdminIsolationMigration = async () => {
  try {
    console.log("🛠️ Starting Admin Isolation Migration...");

    const collection = mongoose.connection.collection("custommandis");
    const indexes = await collection.indexes();

    // 1. Identify and drop the old conflicting index
    // Look for a unique index that has 'mandi' but lacks 'ownerId'
    const oldIndex = indexes.find(idx => 
      idx.unique && !idx.key.ownerId && idx.key.mandi
    );

    if (oldIndex) {
      console.log(`🗑️ Dropping old conflicting index: ${oldIndex.name}`);
      await collection.dropIndex(oldIndex.name);
    } else {
      console.log("✅ No conflicting old index found.");
    }

    // 2. Patch legacy records (records with missing ownerId)
    // Using a direct MongoDB update to avoid any schema validation issues during migration
    const legacyCount = await CustomMandi.countDocuments({ 
      $or: [
        { ownerId: { $exists: false } },
        { ownerId: null }
      ] 
    });

    if (legacyCount > 0) {
      console.log(`🩹 Found ${legacyCount} legacy records. Migrating...`);
      
      const admins = await Admin.find({});
      const adminMap = new Map(admins.map(a => [a.email.toLowerCase().trim(), a._id]));
      const defaultAdmin = admins[0];

      const records = await CustomMandi.find({ 
        $or: [
          { ownerId: { $exists: false } },
          { ownerId: null }
        ] 
      });

      for (const record of records) {
        const email = record.addedBy?.toLowerCase().trim();
        const ownerId = adminMap.get(email) || (defaultAdmin ? defaultAdmin._id : null);
        
        if (ownerId) {
          await CustomMandi.updateOne(
            { _id: record._id },
            { $set: { ownerId: ownerId } }
          );
        }
      }
      console.log("✅ Legacy records patched successfully.");
    } else {
      console.log("✅ No legacy records requiring patch.");
    }

    // 3. Finalize
    console.log("🚀 Migration complete. Multi-admin isolation is now active.");
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    // We don't exit process here to allow the server to still start, 
    // but the issue will be logged.
  }
};
