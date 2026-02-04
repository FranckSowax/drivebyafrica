#!/usr/bin/env python3
"""Generate the Driveby Africa Admin Guide PDF - English Version."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

MANDARIN = HexColor('#E85D04')
COD_GRAY = HexColor('#1a1a1a')
LIGHT_TEXT = HexColor('#555555')
BORDER_COLOR = HexColor('#E0E0E0')
LIGHT_BG = HexColor('#F8F8F8')
SECTION_BG = HexColor('#FFF5EE')

WIDTH, HEIGHT = A4

styles = {
    'h1': ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=22, textColor=MANDARIN, spaceBefore=20, spaceAfter=12, leading=28),
    'h2': ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=16, textColor=COD_GRAY, spaceBefore=16, spaceAfter=8, leading=22),
    'h3': ParagraphStyle('h3', fontName='Helvetica-Bold', fontSize=13, textColor=HexColor('#333333'), spaceBefore=12, spaceAfter=6, leading=18),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10.5, textColor=HexColor('#333333'), alignment=TA_JUSTIFY, spaceBefore=4, spaceAfter=6, leading=15),
    'tip_text': ParagraphStyle('tip_text', fontName='Helvetica', fontSize=10, textColor=HexColor('#1B5E20'), leading=14, spaceBefore=2, spaceAfter=2),
    'warn_text': ParagraphStyle('warn_text', fontName='Helvetica', fontSize=10, textColor=HexColor('#B45309'), leading=14, spaceBefore=2, spaceAfter=2),
    'toc_item': ParagraphStyle('toc_item', fontName='Helvetica', fontSize=12, textColor=COD_GRAY, spaceBefore=6, spaceAfter=6, leading=18, leftIndent=10),
    'step_num': ParagraphStyle('step_num', fontName='Helvetica-Bold', fontSize=11, textColor=white, alignment=TA_CENTER),
    'step_title': ParagraphStyle('step_title', fontName='Helvetica-Bold', fontSize=11, textColor=COD_GRAY, leading=15),
    'step_desc': ParagraphStyle('step_desc', fontName='Helvetica', fontSize=9.5, textColor=LIGHT_TEXT, leading=13),
}


def make_tip_box(text, box_type='tip'):
    if box_type == 'tip':
        bg, border, icon = HexColor('#E8F5E9'), HexColor('#4CAF50'), 'TIP'
        style = styles['tip_text']
    elif box_type == 'warn':
        bg, border, icon = HexColor('#FFF8E1'), HexColor('#FF9800'), 'IMPORTANT'
        style = styles['warn_text']
    else:
        bg, border, icon = HexColor('#E3F2FD'), HexColor('#2196F3'), 'INFO'
        style = ParagraphStyle('info_text', parent=styles['tip_text'], textColor=HexColor('#0D47A1'))
    data = [[Paragraph(f'<b>{icon}:</b> {text}', style)]]
    t = Table(data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), bg), ('BOX', (0, 0), (-1, -1), 1, border),
        ('LEFTPADDING', (0, 0), (-1, -1), 14), ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4])]))
    return t


def make_numbered_step(number, title, description):
    num_data = [[Paragraph(str(number), styles['step_num'])]]
    num_table = Table(num_data, colWidths=[24], rowHeights=[24])
    num_table.setStyle(TableStyle([('BACKGROUND', (0, 0), (0, 0), MANDARIN), ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('VALIGN', (0, 0), (0, 0), 'MIDDLE'), ('ROUNDEDCORNERS', [12, 12, 12, 12])]))
    content = [Paragraph(title, styles['step_title'])]
    if description:
        content.append(Paragraph(description, styles['step_desc']))
    data = [[num_table, content]]
    t = Table(data, colWidths=[34, WIDTH - 4.5 * cm])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('LEFTPADDING', (1, 0), (1, 0), 8), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 6)]))
    return t


def make_table(header, rows, col_widths=None):
    data = [header] + rows
    if not col_widths:
        col_widths = [int((WIDTH - 4 * cm) / len(header))] * len(header)
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), MANDARIN), ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'), ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TEXTCOLOR', (0, 1), (-1, -1), HexColor('#333333')),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6), ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t


def draw_cover(c, doc):
    c.saveState()
    c.setFillColor(COD_GRAY)
    c.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    c.setFillColor(MANDARIN)
    c.rect(0, HEIGHT - 8 * mm, WIDTH, 8 * mm, fill=1, stroke=0)
    c.setFillColor(HexColor('#2a2a2a'))
    c.circle(WIDTH / 2, HEIGHT / 2 + 40 * mm, 80 * mm, fill=1, stroke=0)
    c.setFillColor(MANDARIN)
    c.roundRect(WIDTH / 2 - 50 * mm, HEIGHT - 75 * mm, 100 * mm, 30 * mm, 6, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 24)
    c.drawCentredString(WIDTH / 2, HEIGHT - 60 * mm, 'DRIVEBY AFRICA')
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 30)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 25 * mm, 'Administrator Guide')
    c.setFillColor(HexColor('#FFCCAA'))
    c.setFont('Helvetica', 16)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 5 * mm, 'Platform Management')
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 10 * mm, 'and Full Administration')
    c.setStrokeColor(MANDARIN)
    c.setLineWidth(2)
    c.line(WIDTH / 2 - 40 * mm, HEIGHT / 2 - 25 * mm, WIDTH / 2 + 40 * mm, HEIGHT / 2 - 25 * mm)
    c.setFillColor(HexColor('#888888'))
    c.setFont('Helvetica', 11)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 40 * mm, 'Version 2.0 - February 2026')
    c.setFillColor(HexColor('#666666'))
    c.setFont('Helvetica', 9)
    c.drawCentredString(WIDTH / 2, 25 * mm, 'Internal document - For Driveby Africa administrators only')
    c.setFillColor(MANDARIN)
    c.rect(0, 0, WIDTH, 4 * mm, fill=1, stroke=0)
    c.restoreState()


def header_footer(c, doc):
    c.saveState()
    c.setStrokeColor(MANDARIN)
    c.setLineWidth(1.5)
    c.line(2 * cm, HEIGHT - 1.5 * cm, WIDTH - 2 * cm, HEIGHT - 1.5 * cm)
    c.setFillColor(HexColor('#999999'))
    c.setFont('Helvetica', 8)
    c.drawString(2 * cm, HEIGHT - 1.3 * cm, 'Driveby Africa - Administrator Guide')
    c.drawRightString(WIDTH - 2 * cm, HEIGHT - 1.3 * cm, 'v2.0')
    c.setStrokeColor(BORDER_COLOR)
    c.setLineWidth(0.5)
    c.line(2 * cm, 1.5 * cm, WIDTH - 2 * cm, 1.5 * cm)
    c.setFillColor(HexColor('#999999'))
    c.setFont('Helvetica', 8)
    c.drawString(2 * cm, 1 * cm, 'Confidential document')
    c.drawRightString(WIDTH - 2 * cm, 1 * cm, f'Page {doc.page}')
    c.restoreState()


def bullet(text):
    return Paragraph(f'&bull; {text}', ParagraphStyle('list', parent=styles['body'], leftIndent=15))


def build_guide():
    output_path = '/Users/user/Downloads/drivebyafrica-main/public/guides/Guide-Admin-Driveby-Africa-EN.pdf'
    doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=2.2 * cm, bottomMargin=2 * cm, leftMargin=2 * cm, rightMargin=2 * cm)
    story = []

    story.append(Spacer(1, 1))
    story.append(PageBreak())

    # TOC
    story.append(Paragraph('Table of Contents', styles['h1']))
    story.append(Spacer(1, 8))
    toc = [
        ('1.', 'Login and Roles'),
        ('2.', 'Dashboard and KPIs'),
        ('3.', 'Vehicle Management'),
        ('4.', 'Source Synchronization'),
        ('5.', 'Order Management'),
        ('6.', 'Quote Management'),
        ('7.', 'Vehicle Reassignment'),
        ('8.', 'User Management'),
        ('9.', 'Shipping Routes and Costs'),
        ('10.', 'Shipping Partners (Freight Forwarders)'),
        ('11.', 'Currency Management'),
        ('12.', 'Vehicle Batches'),
        ('13.', 'Notifications and Messages'),
        ('14.', 'Platform Settings'),
        ('15.', 'Analytics and Profits'),
    ]
    for num, title in toc:
        data = [[Paragraph(f'<b>{num}</b>', ParagraphStyle('n', parent=styles['toc_item'], textColor=MANDARIN)),
                 Paragraph(title, styles['toc_item'])]]
        t = Table(data, colWidths=[30, WIDTH - 4.5 * cm])
        t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2), ('LINEBELOW', (0, 0), (-1, -1), 0.3, HexColor('#EEEEEE'))]))
        story.append(t)
    story.append(PageBreak())

    # S1
    story.append(Paragraph('1. Login and Roles', styles['h1']))
    story.append(Paragraph("The admin portal is accessible at <b>/admin/login</b>. Only users with the <b>admin</b> or <b>super_admin</b> role can access it.", styles['body']))
    story.append(Spacer(1, 6))
    story.append(Paragraph('Available Roles', styles['h2']))
    story.append(make_table(['Role', 'Access', 'Description'],
        [['User', 'Public site', 'Standard client - browsing and quotes'],
         ['Collaborator', 'Collab portal', 'Order management, vehicles, batches'],
         ['Admin', 'Admin portal', 'Full access to all features'],
         ['Super Admin', 'Admin portal', 'Admin + role and settings management']], [80, 100, 285]))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("The session stays active for 7 days via a cookie (dba-auth-marker). Use the Logout button in the sidebar to sign out."))
    story.append(PageBreak())

    # S2
    story.append(Paragraph('2. Dashboard and KPIs', styles['h1']))
    story.append(Paragraph("The dashboard displays real-time key performance indicators for the platform.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Main Indicators', styles['h2']))
    story.append(make_table(['KPI', 'Description'],
        [['Total vehicles', 'Number of vehicles in database (all sources)'],
         ['Users', 'Total registered users'],
         ['Quotes', 'Total quotes generated'],
         ['Orders', 'Total orders in progress'],
         ['Deposits collected', 'Total deposits received (USD)'],
         ['Order value', 'Total order value in FCFA'],
         ['Acceptance rate', 'Percentage of accepted quotes']], [140, 325]))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Charts and Trends', styles['h2']))
    story.append(bullet('<b>Time series</b>: users and quotes over 7d/30d/90d'))
    story.append(bullet('<b>Vehicle inventory</b>: trends by source (Korea, China, Dubai)'))
    story.append(bullet('<b>Popular destinations</b>: top countries with flags'))
    story.append(bullet('<b>Popular makes</b>: most requested vehicles'))
    story.append(bullet('<b>Monthly comparison</b>: user/quote/vehicle bar charts'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("You can manually record a vehicle inventory snapshot for historical tracking.", 'info'))
    story.append(PageBreak())

    # S3
    story.append(Paragraph('3. Vehicle Management', styles['h1']))
    story.append(Paragraph("The Vehicles section has three tabs: <b>Statistics</b>, <b>Vehicles</b> and <b>Synchronization</b>.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Statistics', styles['h2']))
    story.append(bullet('Total count by status: available, reserved, sold, pending'))
    story.append(bullet('Breakdown by source: Korea, China, Dubai'))
    story.append(bullet('Visible vs. hidden vehicles'))
    story.append(bullet('Average vehicle price'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Vehicle List', styles['h2']))
    story.append(bullet('<b>Search</b> by make, model or source ID'))
    story.append(bullet('<b>Filters</b>: status, visibility, price range'))
    story.append(bullet('<b>Bulk actions</b>: mass update status, visibility or price'))
    story.append(bullet('<b>Bulk delete</b>: remove multiple vehicles'))
    story.append(bullet('<b>Manual add</b>: create a vehicle with all details'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("Manual add lets you enter make, model, year, source, price, photos and all technical attributes.", 'info'))
    story.append(PageBreak())

    # S4
    story.append(Paragraph('4. Source Synchronization', styles['h1']))
    story.append(Paragraph("The Sync tab imports vehicles from external APIs: <b>Encar</b> (Korea), <b>CHE168/Dongchedi</b> (China), <b>Dubicars</b> (Dubai).", styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_table(['Mode', 'Description', 'Usage'],
        [['Full Sync', 'Complete import of all vehicles', 'First use or full resync'],
         ['Change Sync', 'Incremental import (new/modified only)', 'Daily use']], [90, 200, 175]))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Displayed information:', styles['h3']))
    story.append(bullet('Last sync: date and time'))
    story.append(bullet('Status: running, success, failed'))
    story.append(bullet('Vehicles added, updated, removed'))
    story.append(bullet('Complete sync history'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("Prefer Change Sync for daily updates. Full Sync may take longer.", 'warn'))
    story.append(PageBreak())

    # S5
    story.append(Paragraph('5. Order Management', styles['h1']))
    story.append(Paragraph("Order management follows a 14-step workflow (same as collaborator guide). Admins have additional capabilities.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Summary Cards', styles['h2']))
    story.append(bullet('Deposits paid / Vehicles purchased / In transit / Shipping / Delivered'))
    story.append(bullet('Total deposits in USD'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Order Detail (modal)', styles['h2']))
    story.append(bullet('<b>Visual timeline</b> of 14 steps'))
    story.append(bullet('<b>Update form</b>: status, note, ETA, shipping partner'))
    story.append(bullet('<b>Documents section</b>: upload by step'))
    story.append(bullet('<b>Financial summary</b>: vehicle price, shipping, insurance, total, deposit, balance'))
    story.append(bullet('<b>Activity history</b>: who changed what and when'))
    story.append(bullet('<b>Collaborator badge</b>: identifies last person who modified'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("The 'Vehicle Received' status (step 6) is invisible to clients and requires assigning a freight forwarder.", 'warn'))
    story.append(PageBreak())

    # S6
    story.append(Paragraph('6. Quote Management', styles['h1']))
    story.append(Paragraph("The Quotes page displays the complete pipeline with real-time statistics.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Quote Pipeline', styles['h2']))
    story.append(make_table(['Status', 'Description'],
        [['Pending', 'Quote awaiting admin validation'],
         ['Awaiting payment', 'Quote validated, waiting for client deposit'],
         ['Accepted', 'Deposit received, order in progress'],
         ['Rejected', 'Quote rejected by client or admin'],
         ['Reassigned', 'Vehicle changed, new quote proposed'],
         ['Price sent', 'Custom price sent to client']], [140, 325]))
    story.append(Spacer(1, 10))
    story.append(Paragraph('Quote Actions', styles['h2']))
    story.append(make_numbered_step(1, 'Validate a quote', 'Review details and confirm the price.'))
    story.append(make_numbered_step(2, 'Set a custom price', 'Enter a price in USD, auto-converted to FCFA. Add an optional note.'))
    story.append(make_numbered_step(3, 'Accept or reject', 'Change the quote status after verification.'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("Custom prices are automatically converted at the current USD/XAF exchange rate."))
    story.append(PageBreak())

    # S7
    story.append(Paragraph('7. Vehicle Reassignment', styles['h1']))
    story.append(Paragraph("When a vehicle is no longer available (sold, unavailable, priority conflict), you can reassign the quote to a similar vehicle.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_numbered_step(1, 'Select the reason', 'Sold, unavailable, priority conflict, price change, other.'))
    story.append(make_numbered_step(2, 'Auto-suggested vehicles', 'The system suggests 3 similar vehicles (make/model/year/price) with similarity scores.'))
    story.append(make_numbered_step(3, 'Confirm reassignment', 'The client is notified and can accept or reject.'))
    story.append(Spacer(1, 8))
    story.append(Paragraph("The <b>Reassignments</b> tab in Quotes shows the complete reassignment history.", styles['body']))
    story.append(PageBreak())

    # S8
    story.append(Paragraph('8. User Management', styles['h1']))
    story.append(Paragraph("The Users page displays all accounts with their statistics.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Displayed Information', styles['h2']))
    story.append(bullet('<b>Profile</b>: name, avatar, phone, WhatsApp, country'))
    story.append(bullet('<b>Role</b>: colored badge (User, Admin, Super Admin, Collaborator)'))
    story.append(bullet('<b>Verification</b>: account verification status'))
    story.append(bullet('<b>Statistics</b>: quotes count, orders count, total spending'))
    story.append(bullet('<b>Registration date</b> and last activity'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Features', styles['h2']))
    story.append(bullet('Search by name, phone, WhatsApp or country'))
    story.append(bullet('Sortable columns'))
    story.append(bullet('Detailed profile modal'))
    story.append(bullet('Pagination (20 users per page)'))
    story.append(PageBreak())

    # S9
    story.append(Paragraph('9. Shipping Routes and Costs', styles['h1']))
    story.append(Paragraph("The Shipping section manages 65+ African destinations and their shipping costs.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Route Management', styles['h2']))
    story.append(bullet('<b>Search</b> by destination or country'))
    story.append(bullet('<b>Editable costs</b> (USD): Korea, China, Dubai for 20ft container'))
    story.append(bullet('<b>40ft option</b>: optional costs for 40ft container'))
    story.append(bullet('<b>Enable/Disable</b> routes'))
    story.append(bullet('<b>Bulk editing</b>: update multiple routes simultaneously'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Additional Tabs', styles['h2']))
    story.append(bullet('<b>Partners</b>: manage shipping companies'))
    story.append(bullet('<b>Comparison</b>: side-by-side cost view by source'))
    story.append(PageBreak())

    # S10
    story.append(Paragraph('10. Shipping Partners', styles['h1']))
    story.append(Paragraph("The Freight Forwarders page manages logistics partners.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_table(['Field', 'Description'],
        [['Name / Company', 'Partner identity'],
         ['Country / Port', 'Coverage area'],
         ['Contact', 'Phone, WhatsApp, email, address'],
         ['Specialties', 'Tags (e.g., container, RORO, vehicle)'],
         ['Languages', 'Languages spoken'],
         ['Rating / Reviews', 'Average rating and review count'],
         ['Status', 'Active / Verified']], [120, 345]))
    story.append(Spacer(1, 8))
    story.append(bullet('Add, edit, delete freight forwarders'))
    story.append(bullet('Filter by country or port'))
    story.append(bullet('Search by name or company'))
    story.append(PageBreak())

    # S11
    story.append(Paragraph('11. Currency Management', styles['h1']))
    story.append(Paragraph("The Currencies page configures exchange rates and active currencies.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(bullet('<b>Exchange rates</b>: edit rate relative to USD'))
    story.append(bullet('<b>History</b>: old rate, new rate, date, notes'))
    story.append(bullet('<b>Enable/Disable</b> currencies'))
    story.append(bullet('<b>Display order</b>: customize ordering'))
    story.append(bullet('<b>Flags</b>: visual identification by country'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("Exchange rates directly affect prices shown to clients. Check their accuracy regularly.", 'warn'))
    story.append(PageBreak())

    # S12
    story.append(Paragraph('12. Vehicle Batches', styles['h1']))
    story.append(Paragraph("The Batches section manages batch submissions from collaborators.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Validation Workflow', styles['h2']))
    story.append(make_numbered_step(1, 'Submission by collaborator', 'The collaborator creates a batch with quantity, unit price and vehicle details.'))
    story.append(make_numbered_step(2, 'Admin review', 'Verify batch details: vehicles, price, description.'))
    story.append(make_numbered_step(3, 'Approve or reject', 'Approving makes vehicles visible. Rejecting includes an explanatory note.'))
    story.append(Spacer(1, 8))
    story.append(make_table(['Status', 'Action'],
        [['Pending', 'Awaiting admin review'],
         ['Approved', 'Vehicles visible on the website'],
         ['Rejected', 'Rejected with reason shown to collaborator']], [120, 345]))
    story.append(PageBreak())

    # S13
    story.append(Paragraph('13. Notifications and Messages', styles['h1']))
    story.append(Spacer(1, 6))
    story.append(Paragraph('Notifications', styles['h2']))
    story.append(Paragraph("The Notifications panel centralizes all platform events.", styles['body']))
    story.append(bullet('<b>Types</b>: new orders, quotes, payments, status updates'))
    story.append(bullet('<b>Priorities</b>: Urgent, High, Normal, Low'))
    story.append(bullet('<b>Actions</b>: mark as read, delete, view linked entity'))
    story.append(bullet('<b>Filters</b>: by priority, unread only'))
    story.append(Spacer(1, 12))
    story.append(Paragraph('Messages / Chat', styles['h2']))
    story.append(Paragraph("The Messages interface enables communication with clients.", styles['body']))
    story.append(bullet('<b>Conversation list</b> with last message preview'))
    story.append(bullet('<b>Filters</b>: Active, Waiting for Agent, Closed'))
    story.append(bullet('<b>Chat interface</b>: full history, send replies'))
    story.append(bullet('<b>Message types</b>: user (blue), bot (gray), agent (green)'))
    story.append(bullet('<b>Direct WhatsApp contact</b> from conversation'))
    story.append(PageBreak())

    # S14
    story.append(Paragraph('14. Platform Settings', styles['h1']))
    story.append(Paragraph("The Settings page configures the platform.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_table(['Category', 'Options'],
        [['General', 'Site name, description, default currency, language, timezone'],
         ['Contact', 'Email, phone, WhatsApp number'],
         ['Notifications', 'Enable/disable email and WhatsApp'],
         ['Maintenance', 'Enable/disable maintenance mode']], [120, 345]))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("Maintenance mode shows an unavailability page to visitors. Use it for updates.", 'warn'))
    story.append(PageBreak())

    # S15
    story.append(Paragraph('15. Analytics and Profits', styles['h1']))
    story.append(Paragraph("The Analytics page offers a detailed view of profitability and performance.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Profit Analysis', styles['h2']))
    story.append(bullet('<b>Total orders</b> with price data'))
    story.append(bullet('<b>Driveby price vs. source price</b>: detailed comparison'))
    story.append(bullet('<b>Total profit</b> in USD'))
    story.append(bullet('<b>Average margin percentage</b>'))
    story.append(bullet('<b>Breakdown by source</b>: Korea, China, Dubai'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Detailed Data', styles['h2']))
    story.append(bullet('Each order with Driveby purchase price, source price, profit'))
    story.append(bullet('Time-series charts: users, quotes, inventory'))
    story.append(bullet('Current exchange rate (USD/XAF)'))
    story.append(Spacer(1, 12))

    final_data = [[Paragraph(
        "<b>Technical Support</b><br/><br/>"
        "For any questions about platform administration, "
        "contact the Driveby Africa technical team. "
        "For urgent issues, use the internal communication channel.",
        ParagraphStyle('final', parent=styles['body'], alignment=TA_CENTER, fontSize=11))]]
    t = Table(final_data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), SECTION_BG), ('BOX', (0, 0), (-1, -1), 1.5, MANDARIN),
        ('LEFTPADDING', (0, 0), (-1, -1), 20), ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('TOPPADDING', (0, 0), (-1, -1), 16), ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('ROUNDEDCORNERS', [6, 6, 6, 6])]))
    story.append(t)

    doc.build(story, onFirstPage=draw_cover, onLaterPages=header_footer)
    print(f'PDF generated: {output_path}')


if __name__ == '__main__':
    build_guide()
