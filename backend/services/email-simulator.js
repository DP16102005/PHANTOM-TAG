/**
 * Phantom-Tag Email Simulator
 *
 * Simulates Gmail API email sending for local development.
 * Logs email details to console and saves PDF locally.
 * Returns response matching Gmail API format.
 */

const { saveDMCAPdf } = require('./pdf-generator');
const path = require('path');

const STORAGE_ROOT = path.join(__dirname, '..', '..', 'storage', 'dmca_pdfs');

async function simulateEmailSend(violation) {
  // Generate and save the DMCA PDF
  const pdf = await saveDMCAPdf(violation, STORAGE_ROOT);

  const emailDetails = {
    to: 'copyright@platform.com',
    from: violation.owner_email || 'enforcement@phantom-tag.dev',
    subject: `DMCA Takedown Notice — ${violation.matched_asset_title || 'Protected Content'}`,
    attachment: pdf.filename,
    timestamp: new Date().toISOString(),
  };

  // Log to console (simulating Gmail API send)
  console.log('\n' + '='.repeat(60));
  console.log('📧 [EMAIL SIMULATOR] DMCA Takedown Email Sent');
  console.log('='.repeat(60));
  console.log(`  To:         ${emailDetails.to}`);
  console.log(`  From:       ${emailDetails.from}`);
  console.log(`  Subject:    ${emailDetails.subject}`);
  console.log(`  Attachment: ${pdf.filename}`);
  console.log(`  Saved to:   ${pdf.path}`);
  console.log(`  Timestamp:  ${emailDetails.timestamp}`);
  console.log('='.repeat(60) + '\n');

  return {
    status: 'simulated',
    message_id: `sim_${Date.now()}`,
    email: emailDetails,
    pdf_path: pdf.path,
    pdf_filename: pdf.filename,
    // Mimics Gmail API response format
    gmail_response: {
      id: `sim_${Date.now()}`,
      threadId: `thread_${Date.now()}`,
      labelIds: ['SENT'],
    },
  };
}

module.exports = { simulateEmailSend };
