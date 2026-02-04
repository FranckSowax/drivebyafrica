#!/usr/bin/env python3
"""Generate the Driveby Africa Collaborator Guide PDF - English Version."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas as canvasmod

# Brand colors
MANDARIN = HexColor('#E85D04')
JEWEL = HexColor('#1B7A43')
COD_GRAY = HexColor('#1a1a1a')
DARK_BG = HexColor('#2d2d2d')
LIGHT_TEXT = HexColor('#555555')
BORDER_COLOR = HexColor('#E0E0E0')
LIGHT_BG = HexColor('#F8F8F8')
SECTION_BG = HexColor('#FFF5EE')

WIDTH, HEIGHT = A4

# Styles
styles = {
    'cover_title': ParagraphStyle(
        'cover_title', fontName='Helvetica-Bold', fontSize=32,
        textColor=white, alignment=TA_CENTER, leading=40,
    ),
    'cover_subtitle': ParagraphStyle(
        'cover_subtitle', fontName='Helvetica', fontSize=16,
        textColor=HexColor('#FFCCAA'), alignment=TA_CENTER, leading=22,
    ),
    'h1': ParagraphStyle(
        'h1', fontName='Helvetica-Bold', fontSize=22,
        textColor=MANDARIN, spaceBefore=20, spaceAfter=12, leading=28,
    ),
    'h2': ParagraphStyle(
        'h2', fontName='Helvetica-Bold', fontSize=16,
        textColor=COD_GRAY, spaceBefore=16, spaceAfter=8, leading=22,
    ),
    'h3': ParagraphStyle(
        'h3', fontName='Helvetica-Bold', fontSize=13,
        textColor=HexColor('#333333'), spaceBefore=12, spaceAfter=6, leading=18,
    ),
    'body': ParagraphStyle(
        'body', fontName='Helvetica', fontSize=10.5,
        textColor=HexColor('#333333'), alignment=TA_JUSTIFY,
        spaceBefore=4, spaceAfter=6, leading=15,
    ),
    'body_bold': ParagraphStyle(
        'body_bold', fontName='Helvetica-Bold', fontSize=10.5,
        textColor=HexColor('#333333'), spaceBefore=4, spaceAfter=6, leading=15,
    ),
    'small': ParagraphStyle(
        'small', fontName='Helvetica', fontSize=9,
        textColor=LIGHT_TEXT, leading=13,
    ),
    'tip_text': ParagraphStyle(
        'tip_text', fontName='Helvetica', fontSize=10,
        textColor=HexColor('#1B5E20'), leading=14,
        spaceBefore=2, spaceAfter=2,
    ),
    'warn_text': ParagraphStyle(
        'warn_text', fontName='Helvetica', fontSize=10,
        textColor=HexColor('#B45309'), leading=14,
        spaceBefore=2, spaceAfter=2,
    ),
    'toc_item': ParagraphStyle(
        'toc_item', fontName='Helvetica', fontSize=12,
        textColor=COD_GRAY, spaceBefore=6, spaceAfter=6, leading=18,
        leftIndent=10,
    ),
    'toc_section': ParagraphStyle(
        'toc_section', fontName='Helvetica-Bold', fontSize=13,
        textColor=MANDARIN, spaceBefore=12, spaceAfter=4, leading=18,
    ),
    'step_num': ParagraphStyle(
        'step_num', fontName='Helvetica-Bold', fontSize=11,
        textColor=white, alignment=TA_CENTER,
    ),
    'step_title': ParagraphStyle(
        'step_title', fontName='Helvetica-Bold', fontSize=11,
        textColor=COD_GRAY, leading=15,
    ),
    'step_desc': ParagraphStyle(
        'step_desc', fontName='Helvetica', fontSize=9.5,
        textColor=LIGHT_TEXT, leading=13,
    ),
}


def make_tip_box(text, box_type='tip'):
    if box_type == 'tip':
        bg = HexColor('#E8F5E9')
        border = HexColor('#4CAF50')
        icon = 'TIP'
        style = styles['tip_text']
    elif box_type == 'warn':
        bg = HexColor('#FFF8E1')
        border = HexColor('#FF9800')
        icon = 'IMPORTANT'
        style = styles['warn_text']
    else:
        bg = HexColor('#E3F2FD')
        border = HexColor('#2196F3')
        icon = 'INFO'
        style = ParagraphStyle('info_text', parent=styles['tip_text'], textColor=HexColor('#0D47A1'))

    data = [[Paragraph(f'<b>{icon}:</b> {text}', style)]]
    t = Table(data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('BOX', (0, 0), (-1, -1), 1, border),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    return t


def make_numbered_step(number, title, description):
    num_data = [[Paragraph(str(number), styles['step_num'])]]
    num_table = Table(num_data, colWidths=[24], rowHeights=[24])
    num_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), MANDARIN),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
        ('ROUNDEDCORNERS', [12, 12, 12, 12]),
    ]))

    content = []
    content.append(Paragraph(title, styles['step_title']))
    if description:
        content.append(Paragraph(description, styles['step_desc']))

    data = [[num_table, content]]
    t = Table(data, colWidths=[34, WIDTH - 4.5 * cm])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (0, 0), 0),
        ('LEFTPADDING', (1, 0), (1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t


def make_status_table():
    header = ['Step', 'Status', 'Required Documents', 'Collaborator Action']

    rows = [
        ['1', 'Deposit Paid', 'None', 'Confirm payment receipt'],
        ['2', 'Vehicle Locked', 'Vehicle photos', 'Upload current photos'],
        ['3', 'Inspection Sent', 'Inspection report', 'Upload report (PDF/photos)'],
        ['4', 'Full Payment Received', 'Driveby invoice (auto)', 'Confirm full payment'],
        ['5', 'Vehicle Purchased', 'Purchase invoice (internal)', 'Enter actual purchase price'],
        ['6', 'Vehicle Received', 'Reception photos (internal)', 'Assign shipping partner'],
        ['7', 'Export Customs', 'Export customs docs (internal)', 'Upload export documents'],
        ['8', 'In Transit', 'None', 'Update status'],
        ['9', 'At Port', 'Seal + loading photos', 'Upload container photos'],
        ['10', 'Shipping', 'Tracking URL', 'Add tracking link'],
        ['11', 'Documents Ready', 'BL, Packing list, Release', 'Upload all documents'],
        ['12', 'Customs', 'None', 'Follow up on clearance'],
        ['13', 'Ready for Pickup', 'None', 'Notify the client'],
        ['14', 'Delivered', 'None', 'Confirm delivery'],
    ]

    data = [header] + rows
    col_widths = [35, 95, 140, 195]
    t = Table(data, colWidths=col_widths, repeatRows=1)

    style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), MANDARIN),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, 1), (-1, -1), HexColor('#333333')),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]

    style_commands.append(('BACKGROUND', (0, 5), (0, 5), HexColor('#FFF3E0')))
    style_commands.append(('BACKGROUND', (0, 6), (0, 6), HexColor('#F1F8E9')))

    t.setStyle(TableStyle(style_commands))
    return t


def make_shortcut_table():
    data = [
        ['Action', 'How to do it'],
        ['Contact a client', 'Click the WhatsApp icon in the list or detail view'],
        ['Change status', 'Open order > Status dropdown > Update'],
        ['Upload a document', 'Open order > Documents section > Click Upload'],
        ['Add a note', '"Note" field in the status update form'],
        ['Set the ETA', 'Date picker in the status update form'],
        ['Search', 'Search bar at the top of the orders list'],
        ['Filter by status', 'Filter dropdown next to the search bar'],
        ['View history', '"Activity History" section in the order detail'],
        ['Refresh', '"Refresh" button in the top right corner'],
    ]

    t = Table(data, colWidths=[130, 335])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COD_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9.5),
        ('TEXTCOLOR', (0, 1), (0, -1), MANDARIN),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
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
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 25 * mm, 'Collaborator Guide')

    c.setFillColor(HexColor('#FFCCAA'))
    c.setFont('Helvetica', 16)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 5 * mm, 'Order Management')
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 10 * mm, 'and Delivery Tracking')

    c.setStrokeColor(MANDARIN)
    c.setLineWidth(2)
    c.line(WIDTH / 2 - 40 * mm, HEIGHT / 2 - 25 * mm, WIDTH / 2 + 40 * mm, HEIGHT / 2 - 25 * mm)

    c.setFillColor(HexColor('#888888'))
    c.setFont('Helvetica', 11)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 40 * mm, 'Version 2.0 - February 2026')

    c.setFillColor(HexColor('#666666'))
    c.setFont('Helvetica', 9)
    c.drawCentredString(WIDTH / 2, 25 * mm, 'Internal document - For Driveby Africa collaborators only')

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
    c.drawString(2 * cm, HEIGHT - 1.3 * cm, 'Driveby Africa - Collaborator Guide')
    c.drawRightString(WIDTH - 2 * cm, HEIGHT - 1.3 * cm, 'v2.0')

    c.setStrokeColor(BORDER_COLOR)
    c.setLineWidth(0.5)
    c.line(2 * cm, 1.5 * cm, WIDTH - 2 * cm, 1.5 * cm)

    c.setFillColor(HexColor('#999999'))
    c.setFont('Helvetica', 8)
    c.drawString(2 * cm, 1 * cm, 'Confidential document')
    c.drawRightString(WIDTH - 2 * cm, 1 * cm, f'Page {doc.page}')

    c.restoreState()


def build_guide():
    output_path = '/Users/user/Downloads/drivebyafrica-main/Guide-Collaborateur-Driveby-Africa-EN.pdf'

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=2.2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
    )

    story = []

    # COVER PAGE
    story.append(Spacer(1, 1))
    story.append(PageBreak())

    # TABLE OF CONTENTS
    story.append(Paragraph('Table of Contents', styles['h1']))
    story.append(Spacer(1, 8))

    toc_items = [
        ('1.', 'Logging into the Collaborator Portal'),
        ('2.', 'Dashboard - Overview'),
        ('3.', 'Order Management'),
        ('4.', 'The 14-Step Workflow'),
        ('5.', 'Updating an Order Status'),
        ('6.', 'Uploading Documents'),
        ('7.', 'Special Steps: Purchase and Reception'),
        ('8.', 'Contacting a Client via WhatsApp'),
        ('9.', 'Vehicle Management'),
        ('10.', 'Batch Management'),
        ('11.', 'Notifications and Real-Time Updates'),
        ('12.', 'Quick Reference'),
    ]

    for num, title in toc_items:
        data = [[
            Paragraph(f'<b>{num}</b>', ParagraphStyle('toc_num', parent=styles['toc_item'], textColor=MANDARIN)),
            Paragraph(title, styles['toc_item'])
        ]]
        t = Table(data, colWidths=[30, WIDTH - 4.5 * cm])
        t.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('LINEBELOW', (0, 0), (-1, -1), 0.3, HexColor('#EEEEEE')),
        ]))
        story.append(t)

    story.append(PageBreak())

    # SECTION 1: LOGIN
    story.append(Paragraph('1. Logging into the Portal', styles['h1']))
    story.append(Paragraph(
        'The collaborator portal is accessible at <b>/collaborator/login</b>. '
        'Only users with the <b>collaborator</b>, <b>admin</b> or <b>super_admin</b> '
        'role can access it.',
        styles['body']
    ))
    story.append(Spacer(1, 6))

    story.append(make_numbered_step(1, 'Go to the login page',
        'Navigate to https://drivebyafrica.com/collaborator/login'))
    story.append(make_numbered_step(2, 'Enter your credentials',
        'Type in the email address and password provided by the administrator.'))
    story.append(make_numbered_step(3, 'Choose your language',
        'At the top of the page, select your language: English, French or Chinese.'))
    story.append(make_numbered_step(4, 'Access the dashboard',
        'After logging in, you will be redirected to the collaborator dashboard.'))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        'Your session stays active as long as you do not log out. '
        'Use the "Logout" button in the sidebar to sign out properly.'
    ))

    story.append(PageBreak())

    # SECTION 2: DASHBOARD
    story.append(Paragraph('2. Dashboard', styles['h1']))
    story.append(Paragraph(
        'The dashboard gives you an overview of current activity. '
        'It updates in real time.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Displayed Statistics', styles['h2']))

    stats_data = [
        ['Indicator', 'Description'],
        ['New orders (today)', 'Number of orders received today'],
        ['Processed orders', 'Orders whose status was updated today'],
        ['Completed orders', 'Orders moved to "Delivered" status today'],
        ['Pending actions', 'Orders requiring intervention (early statuses)'],
        ['In progress', 'Orders between deposit paid and export customs'],
        ['In transit', 'Orders in transit or at port'],
        ['Shipping', 'Orders shipping, docs ready, or in customs'],
        ['Completed', 'Orders ready for pickup or delivered'],
    ]

    t = Table(stats_data, colWidths=[175, 290])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COD_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 1), (0, -1), MANDARIN),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t)

    story.append(Spacer(1, 12))
    story.append(Paragraph('Recent Orders', styles['h2']))
    story.append(Paragraph(
        'The 5 most recently updated orders are displayed with their current status, '
        'associated vehicle, and time elapsed since the last change. '
        'Click on an order to go directly to its detail view.',
        styles['body']
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph('Notifications', styles['h2']))
    story.append(Paragraph(
        'The notification panel shows the last 10 events. '
        'Unread notifications are highlighted. Click on a notification to mark it as read '
        'and navigate to the relevant order.',
        styles['body']
    ))

    story.append(PageBreak())

    # SECTION 3: ORDER MANAGEMENT
    story.append(Paragraph('3. Order Management', styles['h1']))
    story.append(Paragraph(
        'The Orders page is the core of your daily activity. It allows you to track, '
        'update, and manage all orders.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Orders List', styles['h2']))
    story.append(Paragraph(
        'The list displays all orders with the following information:',
        styles['body']
    ))

    list_items = [
        '<b>Order number</b> and last update date',
        '<b>Vehicle</b>: photo, make, model, year and price',
        '<b>Client</b>: name and WhatsApp button to contact them',
        '<b>Destination</b>: country flag and destination name',
        '<b>Progress</b>: progress bar and current status',
        '<b>ETA</b>: estimated arrival date',
    ]
    for item in list_items:
        story.append(Paragraph(f'&bull; {item}', ParagraphStyle('list', parent=styles['body'], leftIndent=15)))

    story.append(Spacer(1, 10))
    story.append(Paragraph('Search and Filters', styles['h2']))
    story.append(Paragraph(
        'Use the <b>search bar</b> to find an order by number, vehicle make or model. '
        'The <b>status filter</b> lets you show only orders at a specific stage of the process.',
        styles['body']
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph('Order Detail', styles['h2']))
    story.append(Paragraph(
        'Click on an order to open its detail view. You will find:',
        styles['body']
    ))

    detail_items = [
        '<b>Visual timeline</b> of the 14 steps with progress',
        '<b>Status update form</b> with note and ETA fields',
        '<b>Documents section</b> for uploading required files',
        '<b>Activity history</b> showing who changed what and when',
        '<b>Shipping partner</b> assigned (if applicable)',
        '<b>Client information</b> and destination',
    ]
    for item in detail_items:
        story.append(Paragraph(f'&bull; {item}', ParagraphStyle('list', parent=styles['body'], leftIndent=15)))

    story.append(PageBreak())

    # SECTION 4: 14-STEP WORKFLOW
    story.append(Paragraph('4. The 14-Step Workflow', styles['h1']))
    story.append(Paragraph(
        'Each order follows a 14-step process, from deposit receipt '
        'to final delivery. Some steps require specific documents or actions.',
        styles['body']
    ))
    story.append(Spacer(1, 10))

    story.append(make_status_table())

    story.append(Spacer(1, 10))
    story.append(make_tip_box(
        'Documents marked "(internal)" are <b>not visible to the client</b>. '
        'They are reserved for the admin and collaborator team for internal tracking.',
    ))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        'Step 6 "Vehicle Received" is <b>invisible to the client</b> in their tracking view. '
        'It is an internal step used to assign a shipping partner to the order.',
        'warn'
    ))

    story.append(PageBreak())

    # SECTION 5: UPDATE STATUS
    story.append(Paragraph('5. Updating an Order Status', styles['h1']))
    story.append(Paragraph(
        'To move an order forward in the workflow, you need to update its status. '
        'Here is the step-by-step procedure:',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(make_numbered_step(1, 'Open the order',
        'From the list, click the "View" button or click on the order row.'))
    story.append(make_numbered_step(2, 'Select the new status',
        'In the "Update Status" dropdown, choose the next step in the workflow.'))
    story.append(make_numbered_step(3, 'Add a note (recommended)',
        'Type an explanatory note in the text field. It will be visible in the activity history.'))
    story.append(make_numbered_step(4, 'Set the ETA if needed',
        'Use the date picker to indicate the estimated arrival date.'))
    story.append(make_numbered_step(5, 'Click "Update"',
        'The status is updated immediately. A notification is sent to the client '
        '(except for internal steps).'))

    story.append(Spacer(1, 10))
    story.append(make_tip_box(
        'The "Update" button is disabled if you have not changed the status. '
        'You must select a status different from the current one.',
        'info'
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph('Automatic Notifications', styles['h2']))
    story.append(Paragraph(
        'When you update an order status, the system automatically sends a WhatsApp notification '
        'to the client for visible steps. <b>Exception</b>: the "Vehicle Received" step (step 6) '
        'does <b>not trigger any notification</b> as it is a purely internal step.',
        styles['body']
    ))

    story.append(PageBreak())

    # SECTION 6: DOCUMENTS
    story.append(Paragraph('6. Uploading Documents', styles['h1']))
    story.append(Paragraph(
        'Each workflow step may require specific documents (photos, PDFs, links). '
        'The "Documents" section in the order detail shows you what is expected.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Document Types', styles['h2']))

    doc_types = [
        ['Type', 'Accepted Formats', 'Example'],
        ['Images', 'JPG, PNG', 'Vehicle photos, container seal'],
        ['Documents', 'PDF, DOC, DOCX', 'Invoices, reports, BL'],
        ['URL Links', 'Full URL', 'Container tracking link'],
    ]

    t = Table(doc_types, colWidths=[90, 140, 235])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), MANDARIN),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t)

    story.append(Spacer(1, 12))
    story.append(Paragraph('Upload Procedure', styles['h2']))
    story.append(make_numbered_step(1, 'Open the Documents section',
        'In the order detail, locate the "Documents" section below the status form.'))
    story.append(make_numbered_step(2, 'Identify the required document',
        'Each expected document type is listed with its name and description.'))
    story.append(make_numbered_step(3, 'Click Upload',
        'Select the file from your computer. Progress is displayed in real time.'))
    story.append(make_numbered_step(4, 'Verify the upload',
        'The document appears in the list with a download link.'))

    story.append(Spacer(1, 10))
    story.append(Paragraph('Document Visibility', styles['h2']))
    story.append(Paragraph(
        'Each document has a visibility indicator:',
        styles['body']
    ))
    story.append(Paragraph(
        '&bull; <b>Visible to client</b>: the client can download this document from their dashboard',
        ParagraphStyle('list', parent=styles['body'], leftIndent=15)
    ))
    story.append(Paragraph(
        '&bull; <b>Admin only</b>: reserved for the internal team, the client cannot see it',
        ParagraphStyle('list', parent=styles['body'], leftIndent=15)
    ))
    story.append(Paragraph(
        '&bull; <b>Auto</b>: automatically generated by the system (e.g., Driveby invoice)',
        ParagraphStyle('list', parent=styles['body'], leftIndent=15)
    ))

    story.append(PageBreak())

    # SECTION 7: SPECIAL STEPS
    story.append(Paragraph('7. Special Steps', styles['h1']))

    story.append(Paragraph('Step 5: Vehicle Purchased', styles['h2']))
    story.append(Paragraph(
        'When you move an order to <b>"Vehicle Purchased"</b> status, an additional field '
        'appears to enter the <b>actual purchase price</b> in USD.',
        styles['body']
    ))
    story.append(Spacer(1, 6))

    purchase_data = [
        [Paragraph(
            '<b>Actual Purchase Price (USD)</b><br/>'
            'This field is <b>required</b>. It allows calculating the actual margin on the order.<br/>'
            'This information is strictly confidential and is only visible to '
            'administrators and collaborators.',
            ParagraphStyle('box_text', parent=styles['body'], fontSize=10)
        )]
    ]
    t = Table(purchase_data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#FFF8E1')),
        ('BOX', (0, 0), (-1, -1), 1, HexColor('#FFB300')),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t)

    story.append(Spacer(1, 16))

    story.append(Paragraph('Step 6: Vehicle Received', styles['h2']))
    story.append(Paragraph(
        'The <b>"Vehicle Received"</b> step is an internal step, invisible to the client. '
        'It allows assigning a <b>shipping partner</b> (freight forwarder) to the order.',
        styles['body']
    ))
    story.append(Spacer(1, 6))

    story.append(make_numbered_step(1, 'Select the "Vehicle Received" status',
        'The shipping partner dropdown appears automatically.'))
    story.append(make_numbered_step(2, 'Choose the freight forwarder',
        'Partners are grouped by destination country. Those covering the order\'s destination '
        'country appear first.'))
    story.append(make_numbered_step(3, 'Confirm the update',
        'The freight forwarder is saved and displayed in the order detail.'))

    story.append(Spacer(1, 10))
    story.append(make_tip_box(
        'If no partner covers the destination country, a warning message is displayed. '
        'You can still select a partner from the "Other partners" list.',
        'warn'
    ))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        'The freight forwarder assignment is recorded in the activity history with the partner name '
        'and assignment date. No WhatsApp notification is sent for this step.'
    ))

    story.append(PageBreak())

    # SECTION 8: WHATSAPP
    story.append(Paragraph('8. Contacting a Client', styles['h1']))
    story.append(Paragraph(
        'You can contact a client directly via WhatsApp from the application. '
        'The message is pre-filled with the client\'s name and order number.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('From the orders list', styles['h3']))
    story.append(Paragraph(
        'Click the WhatsApp icon (green) next to the client\'s name in the "Customer" column.',
        styles['body']
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph('From the order detail', styles['h3']))
    story.append(Paragraph(
        'A "Contact" button is available in the "Customer" section at the bottom of the detail view.',
        styles['body']
    ))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        'The WhatsApp number is formatted automatically. If the client does not have a WhatsApp number '
        'on file, the button will not appear.',
        'info'
    ))

    story.append(Spacer(1, 16))

    # SECTION 9: VEHICLES
    story.append(Paragraph('9. Vehicle Management', styles['h1']))
    story.append(Paragraph(
        'The "Vehicles" section lets you manage the vehicles you offer. '
        'You can add, edit and delete vehicles.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Adding a vehicle', styles['h2']))
    story.append(Paragraph(
        'Fill in the form with the vehicle information: make, model, year, price, '
        'mileage, fuel type, transmission and photos. The vehicle will be submitted for approval '
        'by the administrator.',
        styles['body']
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph('Vehicle Statuses', styles['h2']))

    veh_status = [
        ['Status', 'Meaning'],
        ['Pending', 'Awaiting admin approval'],
        ['Approved', 'Approved and visible on the website'],
        ['Rejected', 'Rejected by admin (reason displayed)'],
    ]
    t = Table(veh_status, colWidths=[100, 365])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COD_GRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t)

    story.append(PageBreak())

    # SECTION 10: BATCHES
    story.append(Paragraph('10. Batch Management', styles['h1']))
    story.append(Paragraph(
        'The "Batches" section lets you manage batches of identical vehicles '
        '(same make, model, year) for wholesale.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        'You can create a batch by specifying the available quantity, unit price, '
        'and vehicle details. The batch status follows the same workflow as individual vehicles '
        '(pending, approved, rejected).',
        styles['body']
    ))

    story.append(Spacer(1, 16))

    # SECTION 11: NOTIFICATIONS
    story.append(Paragraph('11. Notifications and Real-Time Updates', styles['h1']))
    story.append(Paragraph(
        'The application works in <b>real time</b>. When another collaborator or an '
        'administrator updates an order, your screen refreshes automatically.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Notification Bell', styles['h2']))
    story.append(Paragraph(
        'In the top right corner, the bell shows the number of unread notifications. '
        'Click on it to open the panel:',
        styles['body']
    ))

    notif_items = [
        'Unread notifications have a blue background',
        'Click a notification to mark it as read',
        'Click "Mark all as read" to clear all at once',
        'Each notification may contain a link to the relevant order',
    ]
    for item in notif_items:
        story.append(Paragraph(f'&bull; {item}', ParagraphStyle('list', parent=styles['body'], leftIndent=15)))

    story.append(Spacer(1, 10))
    story.append(Paragraph('Collaborator Badges', styles['h2']))
    story.append(Paragraph(
        'Each change is identified by a unique color badge assigned to each '
        'collaborator. This lets you see who made the last update on an order.',
        styles['body']
    ))

    story.append(PageBreak())

    # SECTION 12: QUICK REFERENCE
    story.append(Paragraph('12. Quick Reference', styles['h1']))
    story.append(Spacer(1, 8))

    story.append(make_shortcut_table())

    story.append(Spacer(1, 16))

    story.append(Paragraph('Recommended Daily Routine', styles['h2']))
    story.append(Spacer(1, 6))

    story.append(make_numbered_step(1, 'Check the dashboard',
        'Review daily statistics and orders awaiting action.'))
    story.append(make_numbered_step(2, 'Handle priority orders',
        'Start with orders at early stages (deposit paid, vehicle locked).'))
    story.append(make_numbered_step(3, 'Upload missing documents',
        'Verify that all required documents are uploaded for each step.'))
    story.append(make_numbered_step(4, 'Update statuses',
        'Move orders forward when conditions are met.'))
    story.append(make_numbered_step(5, 'Contact clients if needed',
        'Use WhatsApp to answer questions or inform of a change.'))
    story.append(make_numbered_step(6, 'Check notifications',
        'Make sure no important notification was missed.'))

    story.append(Spacer(1, 16))

    final_data = [[Paragraph(
        '<b>Need help?</b><br/><br/>'
        'Contact the Driveby Africa administrator for any technical questions '
        'or access requests. For urgent issues, use the internal communication channel.',
        ParagraphStyle('final', parent=styles['body'], alignment=TA_CENTER, fontSize=11)
    )]]
    t = Table(final_data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SECTION_BG),
        ('BOX', (0, 0), (-1, -1), 1.5, MANDARIN),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('TOPPADDING', (0, 0), (-1, -1), 16),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    story.append(t)

    doc.build(story, onFirstPage=draw_cover, onLaterPages=header_footer)
    print(f'PDF generated: {output_path}')


if __name__ == '__main__':
    build_guide()
