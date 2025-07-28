import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import logoSvg from './logoSvg'
import tetraPakLogoSvg from './tetraPakLogoSvg'

// Main API handler - Vercel compatible
export async function POST(request: Request) {
  try {
    const { reports, userInfo } = await request.json();
    if (!reports || !reports.length) {
      return NextResponse.json({ error: 'No reports provided' }, { status: 400 });
    }

    // For Vercel, we need to process synchronously within the function timeout
    console.log("Starting PDF generation for Vercel...");
    const pdfBuffer = await generatePDFWithPuppeteer(reports, userInfo);
    console.log("PDF generated successfully");
    
    console.log("Sending email...");
    await sendEmail(pdfBuffer, userInfo);
    console.log("Email sent successfully");

    return NextResponse.json({ success: true, message: 'Report generated and emailed successfully' });
  } catch (error) {
    console.error("Error in PDF generation or email sending:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to generate report or send email', details: errorMessage }, { status: 500 });
  }
}



// Generate PDF using Puppeteer - Vercel optimized
async function generatePDFWithPuppeteer(reports: any[], userInfo?: any) {
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',
      '--disable-javascript',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-default-browser-check',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-networking',
      '--disable-component-extensions-with-background-pages',
      '--disable-ipc-flooding-protection',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-domain-reliability',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--metrics-recording-only',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
      '--single-process',
      '--no-zygote',
      '--disable-accelerated-2d-canvas',
      '--disable-features=TranslateUI'
    ] 
  });
  
  try {
    const page = await browser.newPage();
    
    // Vercel optimized page settings
    await page.setViewport({ width: 800, height: 600 });
    await page.setCacheEnabled(false);
    await page.setJavaScriptEnabled(false);
    
    // Create HTML content
    const htmlContent = generateHTMLContent(reports, userInfo);
    
    // Set content with Vercel-compatible waiting
    await page.setContent(htmlContent, { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    });
    
    // Generate PDF with Vercel-compatible settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10px', right: '10px', bottom: '10px', left: '10px' },
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      scale: 0.8
    });
    
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// Generate HTML content for the PDF
function generateHTMLContent(reports: any[], userInfo?: any) {
  // Calculate summary statistics
  const statusCounts: Record<string, number> = {};
  let totalIssues = 0;
  reports.forEach(report => {
    if (report.issues && Array.isArray(report.issues)) {
      report.issues.forEach((issue: any) => {
        statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
        totalIssues++;
      });
    }
  });
  
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const userName = userInfo?.name || 'Site Maintenance Team';
  const isPersonalReport = userInfo?.reportType === 'my-issues';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isPersonalReport ? 'ShiftWise Personal Report' : 'ShiftWise Daily Report'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Computer Modern', 'Latin Modern Roman', 'Times New Roman', Times, serif; line-height: 1.6; color: #000; background: #ffffff; font-size: 12pt; text-align: justify; }
        .container { max-width: 210mm; margin: 0 auto; padding: 25mm; min-height: 297mm; }
        .header { text-align: center; margin-bottom: 30pt; padding-bottom: 20pt; border-bottom: 2px solid #e5e7eb; background: #f8fafc; border-radius: 0 0 18px 18px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
        .logo-container { margin-bottom: 18pt; }
        .logo-container svg { max-width: 140px; height: auto; margin: 0 auto; display: block; filter: drop-shadow(0 2px 8px #b6c6e2); }
        .report-title { font-size: 32pt; font-weight: bold; color: #bfa14a; letter-spacing: 1.5pt; font-family: 'Georgia', 'Times New Roman', Times, serif; margin-bottom: 8pt; text-transform: uppercase; }
        .report-subtitle { font-size: 16pt; font-style: italic; color: #22223b; margin-bottom: 6pt; font-family: 'Georgia', 'Times New Roman', Times, serif; }
        .report-date, .prepared-by { font-size: 12pt; color: #555; margin-bottom: 0; font-family: 'Georgia', 'Times New Roman', Times, serif; }
        .prepared-by { margin-top: 2pt; margin-bottom: 0; }
        .header-divider { width: 60%; margin: 24pt auto 0 auto; border: none; border-top: 2px solid #e5e7eb; }
        
        /* LaTeX-inspired Header */
        .header h1 { font-size: 30pt; font-weight: bold; margin-bottom: 12pt; letter-spacing: 1pt; font-variant: small-caps; color: #c19b2aff }
        .header h2 { font-size: 18pt; font-weight: normal; margin-bottom: 8pt; font-style: italic; }
        .header .date { font-size: 12pt; font-style: italic; }
        .header .prepared-by { font-size: 12pt; margin-top: 10pt; text-align: right; }
        
        /* LaTeX-style Section Headers */
        .section-header { font-size: 16pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; font-variant: small-caps; }
        .subsection-header { font-size: 14pt; font-weight: bold; margin-top: 20pt; margin-bottom: 10pt; font-style: italic; }
        
        /* Executive Summary - Dark Blue Theme */
        .executive-summary { background: #e6f3ff; border: 2pt solid #1e3a8a; padding: 16pt; margin-bottom: 24pt; border-radius: 4pt; box-shadow: 0 2pt 4pt rgba(0,0,0,0.1); }
        .executive-summary h3 { font-size: 14pt; font-weight: bold; margin-bottom: 12pt; background: #1e3a8a; color: white; padding: 8pt; margin: -16pt -16pt 12pt -16pt; border-radius: 2pt 2pt 0 0; font-variant: small-caps; }
        .executive-summary p { margin-bottom: 8pt; text-align: justify; text-indent: 1.5em; }
        
        /* Summary Table - Dark Blue Theme */
        .summary-table { width: 100%; border-collapse: collapse; margin: 20pt 0; font-size: 11pt; border: 2pt solid #1e3a8a; background: #e6f3ff; box-shadow: 0 2pt 4pt rgba(0,0,0,0.1); }
        .summary-table th, .summary-table td { border: 1pt solid #1e3a8a; padding: 8pt; text-align: left; vertical-align: top; }
        .summary-table th { background: #1e3a8a; color: white; font-weight: bold; font-variant: small-caps; }
        .summary-table caption { font-weight: bold; margin-bottom: 8pt; text-align: left; font-variant: small-caps; font-size: 13pt; }
        
        /* Status Colors */
        .status-completed { background-color: #22c55e !important; color: white !important; font-weight: bold; text-align: center; border-radius: 2pt; padding: 4pt; }
        .status-in-progress { background-color: #fbbf24 !important; color: #000 !important; font-weight: bold; text-align: center; border-radius: 2pt; padding: 4pt; }
        .status-open { background-color: #ed5050ff !important; color: #000 !important; font-weight: bold; text-align: center; border-radius: 2pt; padding: 4pt; }
        
        /* Issue Cards - Dark Green Theme */
        .issue-card { margin-bottom: 24pt; page-break-inside: avoid; border: 2pt solid #166534; border-radius: 4pt; background: #f0fdf4; box-shadow: 0 2pt 4pt rgba(0,0,0,0.1); overflow: hidden; }
        .issue-title { font-size: 13pt; font-weight: bold; margin-bottom: 0; background: #166534; color: white; padding: 12pt; font-variant: small-caps; }
        .issue-meta { font-size: 10pt; color: #374151; margin-bottom: 16pt; padding: 8pt 12pt 0 12pt; font-style: italic; }
        .issue-content { padding: 0 12pt 12pt 12pt; }
        .field-group { margin-bottom: 12pt; }
        .field-label { font-weight: bold; margin-bottom: 4pt; font-variant: small-caps; }
        .field-value { margin-left: 20pt; text-align: justify; text-indent: 1.5em; }
        .pmun { font-family: 'Courier New', monospace; background-color: #f5f5f5; padding: 4pt 8pt; border: 1pt solid #ccc; border-radius: 2pt; font-size: 10pt; }
        
        /* Bullet Points */
        .bullet-list { margin-left: 20pt; margin-bottom: 12pt; }
        .bullet-list li { margin-bottom: 4pt; text-align: justify; }
        
        /* Photos Section */
        .photos-section { margin-top: 16pt; page-break-inside: avoid; }
        .photos-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200pt, 1fr)); gap: 12pt; margin-top: 12pt; }
        .photo-item { text-align: center; page-break-inside: avoid; }
        .photo-item img { max-width: 100%; height: auto; border: 1pt solid #000; margin-bottom: 8pt; }
        .photo-caption { font-size: 10pt; font-style: italic; text-align: center; }
        
        /* Footer */
        .report-footer { margin-top: 24pt; padding-top: 12pt; border-top: 1pt solid #000; font-size: 10pt; text-align: center; }
        
        /* Recommendations - Dark Blue Theme */
        .recommendations { background: #e6f3ff; border: 2pt solid #1e3a8a; padding: 16pt; margin: 20pt 0; border-radius: 4pt; box-shadow: 0 2pt 4pt rgba(0,0,0,0.1); }
        .recommendations h4 { font-size: 12pt; font-weight: bold; margin-bottom: 8pt; font-variant: small-caps; }
        
        /* LaTeX-style theorem/definition boxes */
        .theorem-box { border: 1pt solid #000; margin: 12pt 0; padding: 12pt; background: #f9f9f9; }
        .theorem-title { font-weight: bold; font-style: italic; margin-bottom: 8pt; }
        
        /* Print Styles */
        @media print { .container { margin: 0; padding: 20mm; } .issue-card { page-break-inside: avoid; } .photos-section { page-break-inside: avoid; } .executive-summary, .summary-table, .recommendations { break-inside: avoid; } }
        
        /* Additional LaTeX-inspired typography */
        h1, h2, h3, h4, h5, h6 { font-family: 'Computer Modern', 'Latin Modern Roman', 'Times New Roman', Times, serif; }
        
        /* Hyperlink styling */
        a { color: #1e3a8a; text-decoration: none; }
        a:hover { text-decoration: underline; }
        
        .logo-container svg { max-width: 100%; max-height: 150px; width: auto; height: auto; }
        
        /* Math-like spacing */
        .math-spacing { letter-spacing: 0.5pt; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="logo-container">
            ${logoSvg}
          </div>
          <div class="report-title">${isPersonalReport ? 'Personal Issue Report' : 'Daily Issue Report'}</div>
          <div class="report-subtitle">ShiftWise ${isPersonalReport ? 'Individual Activity' : 'Daily Issue'} Report</div>
          <div class="report-date">Date: ${currentDate}</div>
          <div class="prepared-by">Prepared By: ${userName}</div>
          <hr class="header-divider" />
        </div>
        
        <!-- Executive Summary -->
        <div class="executive-summary">
          <h3>Executive Summary</h3>
          <p>This report documents the ${isPersonalReport ? 'personal troubleshooting and maintenance activities carried out by ' + userName : 'on-site troubleshooting and maintenance activities carried out across various stations and equipment'} during the ${isPersonalReport ? 'selected time period' : 'daily shift operations'}. A total of ${totalIssues} issues were identified and addressed, with ${reports.length} detailed reports submitted${isPersonalReport ? '' : ' by the maintenance team'}.</p>
          <p>The issues ranged from routine maintenance tasks to critical equipment failures, all of which were systematically addressed according to standard operating procedures. This comprehensive report provides detailed documentation of each issue, actions taken, and current status for ${isPersonalReport ? 'personal review' : 'management review'} and future reference.</p>
        </div>
        
        <!-- Summary Table -->
        <table class="summary-table">
          <caption>Table 1: Overview of ${isPersonalReport ? 'Personal' : ''} Issues and Resolutions</caption>
          <thead>
            <tr>
              <th>Station/Line</th>
              <th>Issue Title</th>
              <th>Quick Resolution</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${reports.map((report, reportIndex) => report.issues && Array.isArray(report.issues) ? report.issues.map((issue: any, issueIndex: any) => `
              <tr>
                <td>${issue.pmun || `Station ${reportIndex + 1}`}</td>
                <td>${issue.issue || 'Untitled Issue'}</td>
                <td>${issue.actions || 'See detailed report'}</td>
                <td class="status-${issue.status?.toLowerCase().replace(' ', '-') || 'open'}">
                  ${issue.status || 'Open'}
                </td>
              </tr>
            `).join('') : '' ).join('')}
          </tbody>
        </table>
        
        <!-- Detailed Issues Section -->
        <div class="section-header">1 ${isPersonalReport ? 'Personal ' : ''}Faults and Resolutions</div>
        ${reports.map((report, reportIndex) => report.issues && Array.isArray(report.issues) ? report.issues.map((issue: any, issueIndex: any) => `
          <div class="issue-card">
            <div class="issue-title">
              ${issue.status === 'Resolved' || issue.status === 'Completed' ? 'Resolved' : 'Issue'}: ${reportIndex + 1}.${issueIndex + 1} - ${issue.issue || 'Untitled Issue'}
              ${issue.pmun ? ` (${issue.pmun})` : ''}
            </div>
            <div class="issue-meta">
              Issue #${reportIndex + 1}-${issueIndex + 1} | Status: <span class="status-${issue.status?.toLowerCase().replace(' ', '-') || 'open'}">${issue.status || 'Open'}</span> | Submitted by: ${report.submittedBy || 'Unknown'} | Date: ${report.reportDate ? new Date(report.reportDate).toLocaleDateString() : 'Unknown'}
            </div>
            <div class="issue-content">
              ${issue.description ? `
                <div class="field-group">
                  <div class="field-label">• Fault:</div>
                  <div class="field-value">${issue.description}</div>
                </div>
              ` : ''}
              ${issue.actions ? `
                <div class="field-group">
                  <div class="field-label">• Action Taken:</div>
                  <div class="field-value">${issue.actions}</div>
                </div>
              ` : ''}
              ${issue.status === 'Resolved' || issue.status === 'Completed' ? `
                <div class="field-group">
                  <div class="field-label">• Outcome:</div>
                  <div class="field-value">Issue successfully resolved and equipment returned to normal operation.</div>
                </div>
              ` : ''}
              
              ${issue.photos && Array.isArray(issue.photos) && issue.photos.length > 0 ? `
                <div class="photos-section">
                  <div class="field-label">Attached Documentation (${issue.photos.length} images):</div>
                  <div class="photos-grid">
                    ${issue.photos.map((photo: any, photoIndex: any) => `
                      <div class="photo-item">
                        <img src="${photo}" alt="Documentation photo ${photoIndex + 1}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                        <div class="photo-caption" style="display:none;">Image unavailable</div>
                        <div class="photo-caption">Figure ${reportIndex + 1}.${issueIndex + 1}.${photoIndex + 1}: {Description}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('') : '' ).join('')}
        
        <!-- Conclusion and Recommendations -->
        <div class="section-header">2 Conclusion and Recommendations</div>
        
        <div class="recommendations">
          <h4>Summary:</h4>
          <ul class="bullet-list">
            <li>All identified critical issues were successfully addressed during the ${isPersonalReport ? 'period' : 'shift'}.</li>
            <li>Total issues resolved: ${reports.reduce((total, report) => total + (report.issues?.filter((issue: any) => issue.status === 'Resolved' || issue.status === 'Completed')?.length || 0), 0)}</li>
            <li>Issues requiring follow-up: ${reports.reduce((total, report) => total + (report.issues?.filter((issue: any) => issue.status === 'Open' || issue.status === 'In Progress')?.length || 0), 0)}</li>
          </ul>
          
          <h4>${isPersonalReport ? 'Personal ' : ''}Recommendations:</h4>
          <ul class="bullet-list">
            <li>Continue monitoring equipment performance and conducting regular preventive maintenance.</li>
            <li>Ensure all maintenance activities are properly documented and logged in the system.</li>
            <li>Review and update maintenance schedules based on recurring issues identified in this report.</li>
            <li>Provide additional training to operators on early fault detection and reporting procedures.</li>
          </ul>
        </div>
        
        <!-- Footer -->
        <div class="report-footer">
          <p>This report was automatically generated by ShiftWise maintenance management system.</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send email with PDF attachment - maximum speed
async function sendEmail(pdfBuffer: Buffer | Uint8Array, userInfo: any) {
  // Create a nodemailer transporter with maximum speed settings
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'user@example.com',
      pass: process.env.EMAIL_PASSWORD || 'password',
    },
    // Maximum speed settings
    socketTimeout: 5000,
    connectionTimeout: 5000,
    greetingTimeout: 3000
  });

  const dateStr = new Date().toLocaleDateString().replace(/\//g, '-');
  const userName = userInfo?.name || 'Team Member';
  const isPersonalReport = userInfo?.reportType === 'my-issues';
  
  // Debug logging
  console.log('Email Debug Info:');
  console.log('- isPersonalReport:', isPersonalReport);
  console.log('- userInfo?.email:', userInfo?.email);
  console.log('- process.env.EMAIL_RECIPIENT:', process.env.EMAIL_RECIPIENT);
  console.log('- userInfo?.reportType:', userInfo?.reportType);
  
  // Determine recipient based on report type
  const emailRecipient = isPersonalReport 
    ? (userInfo?.email || process.env.EMAIL_RECIPIENT || 'recipient@example.com')
    : (process.env.EMAIL_RECIPIENT || 'recipient@example.com');
  
  console.log('- Email will be sent to:', emailRecipient);
  console.log('- Report type:', isPersonalReport ? 'Personal (My Issues)' : 'All Issues');
  
  // Setup email data
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'ShiftWise <shiftwise@example.com>',
    to: isPersonalReport 
      ? [userInfo?.email, process.env.EMAIL_RECIPIENT].filter(Boolean).join(',')
      : (process.env.EMAIL_RECIPIENT || 'recipient@example.com'),
    subject: isPersonalReport 
      ? `ShiftWise Personal Issue Report - ${dateStr}`
      : `ShiftWise Daily Issue Report - ${dateStr}`,
    text: isPersonalReport 
      ? `Dear ${userName},\n\nPlease find attached your personal issues report for ${dateStr}.\n\nBest regards,\nShiftWise Team`
      : `Please find attached the daily issues report for ${dateStr}.\n\nBest regards,\nShiftWise Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ShiftWise Report</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">ShiftWise</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Maintenance Management System</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
              ${isPersonalReport ? 'Personal Issue Report' : 'Daily Issue Report'}
            </h2>
            
            ${isPersonalReport ? `
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong style="color: #1e293b;">${userName}</strong>,
              </p>
            ` : ''}
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Please find attached the ${isPersonalReport ? 'personal ' : ''}issues report for <strong style="color: #1e293b;">${dateStr}</strong>. 
              ${isPersonalReport 
                ? 'This report contains all issues that you have created, logged, or resolved during the selected time period.'
                : 'This report contains all issues reported during the selected time period.'
              }
            </p>
            
            <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
              <h3 style="color: #1e293b; margin: 0 0 10px 0; font-size: 18px; font-weight: 600;">Report Summary</h3>
              <ul style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                ${isPersonalReport ? `
                  <li>Personal issues created and logged</li>
                  <li>Issues you have resolved or updated</li>
                ` : `
                  <li>All issues reported during the period</li>
                  <li>Issues across all stations and equipment</li>
                `}
                <li>Detailed documentation with photos</li>
                <li>Status tracking and progress updates</li>
              </ul>
            </div>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
              This report was automatically generated by the ShiftWise system ${isPersonalReport ? 'based on your activities' : 'for the selected time period'}. 
              If you have any questions about the content, please contact your supervisor.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <div style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                📎 Report Attached
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">
              This is an automated email from ShiftWise
            </p>
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              Generated on ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: isPersonalReport 
          ? `ShiftWise-Personal-Report-${userName}-${dateStr}.pdf`
          : `ShiftWise-Daily-Report-${dateStr}.pdf`,
        content: Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer),
        contentType: 'application/pdf',
      },
    ],
  };
  
  // Log the final email recipient
  console.log('- Final email recipient:', mailOptions.to);
  
  // Send email
  await transporter.sendMail(mailOptions);
}
