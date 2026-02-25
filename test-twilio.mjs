#!/usr/bin/env node
import twilio from 'twilio';
import { createInterface } from 'readline';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SERVICE = process.env.TWILIO_VERIFY_SERVICE_SID;
const PHONE = '+14148616375';

console.log('=== Twilio Verify Direct Test ===');
console.log(`Account SID: ${SID}`);
console.log(`Service SID: ${SERVICE}`);
console.log(`Phone (E.164): ${PHONE}`);
console.log('');

const client = twilio(SID, TOKEN);

// Step 1: Send verification
console.log('Step 1: Sending verification code...');
try {
  const verification = await client.verify.v2
    .services(SERVICE)
    .verifications.create({ to: PHONE, channel: 'sms' });
  console.log(`  Status: ${verification.status}`);
  console.log(`  SID: ${verification.sid}`);
  console.log(`  Valid: ${verification.valid}`);
  console.log(`  Channel: ${verification.channel}`);
  console.log('  ✅ Code sent successfully!\n');
} catch (err) {
  console.error('  ❌ Failed to send:', err.message);
  console.error('  Code:', err.code, 'Status:', err.status);
  process.exit(1);
}

// Step 2: Wait for user input
const rl = createInterface({ input: process.stdin, output: process.stdout });
const code = await new Promise((resolve) => {
  rl.question('Step 2: Enter the 6-digit code from your SMS: ', resolve);
});
rl.close();

console.log(`\nStep 3: Verifying code "${code}" for ${PHONE}...`);
try {
  const check = await client.verify.v2
    .services(SERVICE)
    .verificationChecks.create({ to: PHONE, code: code.trim() });
  console.log(`  Status: ${check.status}`);
  console.log(`  Valid: ${check.valid}`);
  console.log(`  SID: ${check.sid}`);
  if (check.status === 'approved') {
    console.log('  ✅ Verification APPROVED — Twilio is working correctly!');
    console.log('  The issue is in the app code path, not Twilio itself.');
  } else {
    console.log(`  ⚠️  Verification returned status: ${check.status}`);
    console.log('  The code did not match. Possible issues:');
    console.log('  - Wrong code entered');
    console.log('  - Code expired');
  }
} catch (err) {
  console.error('  ❌ Verification check failed:', err.message);
  console.error('  Code:', err.code, 'Status:', err.status);
  console.error('  More info:', err.moreInfo);
}
