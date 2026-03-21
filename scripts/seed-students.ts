
import * as admin from 'firebase-admin';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
// Ensure you have set GOOGLE_APPLICATION_CREDENTIALS or run 'gcloud auth application-default login'
if (!admin.apps.length) {
    const serviceAccount = require(path.join(process.cwd(), 'service-account.json'));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function seedStudents() {
    const csvPath = path.join(process.cwd(), 'ROLL NUMBER LIST.csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found at ${csvPath}`);
        process.exit(1);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(fileContent, {
        columns: (header: string[]) => header.map(h => h.trim().toUpperCase()), // Normalize headers
        skip_empty_lines: true,
        trim: true
    });

    console.log(`Found ${records.length} records.`);

    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    let total = 0;

    for (const record of records) {
        // CSV columns: ROLL NUMBER, NAME
        const rec = record as any;
        const rollNumber = rec['ROLL NUMBER'] || rec['ROLL_NUMBER'];
        const name = rec['NAME'];

        if (!rollNumber) {
            console.warn('Skipping record without roll number:', record);
            continue;
        }

        // Use roll number as document ID
        const ref = db.collection('allowed_students').doc(String(rollNumber));

        const cleanName = name ? name.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase() : '';
        batch.set(ref, {
            roll_number: String(rollNumber),
            raw_name: name || '',
            name_normalized: cleanName,
        });

        count++;
        total++;

        if (count >= batchSize) {
            await batch.commit();
            console.log(`Committed batch of ${count} records.`);
            batch = db.batch();
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${count} records.`);
    }

    console.log(`Successfully imported ${total} students.`);
}

seedStudents().catch(console.error);
