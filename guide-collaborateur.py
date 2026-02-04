#!/usr/bin/env python3
"""Generate the Driveby Africa Collaborator Guide PDF."""

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
STATUS_GREEN = HexColor('#10B981')
STATUS_BLUE = HexColor('#3B82F6')
STATUS_PURPLE = HexColor('#8B5CF6')
STATUS_YELLOW = HexColor('#F59E0B')
STATUS_ORANGE = HexColor('#F97316')
STATUS_CYAN = HexColor('#06B6D4')
STATUS_LIME = HexColor('#84CC16')

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
    """Create a colored tip/warning box."""
    if box_type == 'tip':
        bg = HexColor('#E8F5E9')
        border = HexColor('#4CAF50')
        icon = 'ASTUCE'
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

    data = [[Paragraph(f'<b>{icon} :</b> {text}', style)]]
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
    """Create a numbered step with circle."""
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
    """Create the 14-step status workflow table."""
    header = ['Etape', 'Statut', 'Documents requis', 'Action collaborateur']

    rows = [
        ['1', 'Acompte paye', 'Aucun', 'Confirmer la reception du paiement'],
        ['2', 'Vehicule bloque', 'Photos du vehicule', 'Uploader les photos actuelles'],
        ['3', 'Inspection envoyee', 'Rapport d\'inspection', 'Uploader le rapport (PDF/photos)'],
        ['4', 'Paiement total recu', 'Facture Driveby (auto)', 'Confirmer le paiement complet'],
        ['5', 'Vehicule achete', 'Facture d\'achat (interne)', 'Saisir le prix d\'achat reel'],
        ['6', 'Reception vehicule', 'Photos de reception (interne)', 'Attribuer le transitaire'],
        ['7', 'Douane export', 'Docs douane export (interne)', 'Uploader les documents export'],
        ['8', 'En transit', 'Aucun', 'Mettre a jour le statut'],
        ['9', 'Au port', 'Photo plomb + chargement', 'Uploader photos container'],
        ['10', 'En mer', 'URL de suivi', 'Ajouter le lien de tracking'],
        ['11', 'Documentation', 'BL, Packing list, Relache', 'Uploader tous les documents'],
        ['12', 'En douane', 'Aucun', 'Suivi du dedouanement'],
        ['13', 'Pret pour retrait', 'Aucun', 'Notifier le client'],
        ['14', 'Livre', 'Aucun', 'Confirmer la livraison'],
    ]

    data = [header] + rows
    col_widths = [35, 95, 140, 195]
    t = Table(data, colWidths=col_widths, repeatRows=1)

    style_commands = [
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), MANDARIN),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        # Body
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, 1), (-1, -1), HexColor('#333333')),
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_BG]),
        # Padding
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]

    # Highlight step 5 and 6 (special actions required)
    style_commands.append(('BACKGROUND', (0, 5), (0, 5), HexColor('#FFF3E0')))
    style_commands.append(('BACKGROUND', (0, 6), (0, 6), HexColor('#F1F8E9')))

    t.setStyle(TableStyle(style_commands))
    return t


def make_shortcut_table():
    """Create keyboard/action shortcuts table."""
    data = [
        ['Action', 'Comment faire'],
        ['Contacter un client', 'Cliquer sur l\'icone WhatsApp dans la liste ou le detail'],
        ['Changer le statut', 'Ouvrir la commande > Dropdown statut > Mettre a jour'],
        ['Uploader un document', 'Ouvrir la commande > Section documents > Cliquer Upload'],
        ['Ajouter une note', 'Champ "Note" dans le formulaire de mise a jour du statut'],
        ['Definir l\'ETA', 'Champ date dans le formulaire de mise a jour'],
        ['Rechercher', 'Barre de recherche en haut de la liste des commandes'],
        ['Filtrer par statut', 'Dropdown de filtre a cote de la recherche'],
        ['Voir l\'historique', 'Section "Activity History" dans le detail commande'],
        ['Actualiser', 'Bouton "Refresh" en haut a droite'],
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
    """Draw the cover page."""
    c.saveState()

    # Full page gradient background
    c.setFillColor(COD_GRAY)
    c.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)

    # Mandarin accent bar at top
    c.setFillColor(MANDARIN)
    c.rect(0, HEIGHT - 8 * mm, WIDTH, 8 * mm, fill=1, stroke=0)

    # Decorative circle
    c.setFillColor(HexColor('#2a2a2a'))
    c.circle(WIDTH / 2, HEIGHT / 2 + 40 * mm, 80 * mm, fill=1, stroke=0)

    # Logo area
    c.setFillColor(MANDARIN)
    c.roundRect(WIDTH / 2 - 50 * mm, HEIGHT - 75 * mm, 100 * mm, 30 * mm, 6, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 24)
    c.drawCentredString(WIDTH / 2, HEIGHT - 60 * mm, 'DRIVEBY AFRICA')

    # Title
    c.setFillColor(white)
    c.setFont('Helvetica-Bold', 30)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 25 * mm, 'Guide du Collaborateur')

    # Subtitle
    c.setFillColor(HexColor('#FFCCAA'))
    c.setFont('Helvetica', 16)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 5 * mm, 'Gestion des commandes')
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 10 * mm, 'et suivi des livraisons')

    # Divider line
    c.setStrokeColor(MANDARIN)
    c.setLineWidth(2)
    c.line(WIDTH / 2 - 40 * mm, HEIGHT / 2 - 25 * mm, WIDTH / 2 + 40 * mm, HEIGHT / 2 - 25 * mm)

    # Version info
    c.setFillColor(HexColor('#888888'))
    c.setFont('Helvetica', 11)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 40 * mm, 'Version 2.0 - Fevrier 2026')

    # Footer
    c.setFillColor(HexColor('#666666'))
    c.setFont('Helvetica', 9)
    c.drawCentredString(WIDTH / 2, 25 * mm, 'Document interne - Usage reserve aux collaborateurs Driveby Africa')

    # Bottom mandarin bar
    c.setFillColor(MANDARIN)
    c.rect(0, 0, WIDTH, 4 * mm, fill=1, stroke=0)

    c.restoreState()


def header_footer(c, doc):
    """Add header and footer to each page."""
    c.saveState()

    # Header line
    c.setStrokeColor(MANDARIN)
    c.setLineWidth(1.5)
    c.line(2 * cm, HEIGHT - 1.5 * cm, WIDTH - 2 * cm, HEIGHT - 1.5 * cm)

    # Header text
    c.setFillColor(HexColor('#999999'))
    c.setFont('Helvetica', 8)
    c.drawString(2 * cm, HEIGHT - 1.3 * cm, 'Driveby Africa - Guide Collaborateur')
    c.drawRightString(WIDTH - 2 * cm, HEIGHT - 1.3 * cm, 'v2.0')

    # Footer
    c.setStrokeColor(BORDER_COLOR)
    c.setLineWidth(0.5)
    c.line(2 * cm, 1.5 * cm, WIDTH - 2 * cm, 1.5 * cm)

    c.setFillColor(HexColor('#999999'))
    c.setFont('Helvetica', 8)
    c.drawString(2 * cm, 1 * cm, 'Document confidentiel')
    c.drawRightString(WIDTH - 2 * cm, 1 * cm, f'Page {doc.page}')

    c.restoreState()


def build_guide():
    """Build the complete PDF guide."""
    output_path = '/Users/user/Downloads/drivebyafrica-main/Guide-Collaborateur-Driveby-Africa.pdf'

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=2.2 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
    )

    story = []

    # ==========================================
    # COVER PAGE (handled by onFirstPage)
    # ==========================================
    # Use a small spacer + PageBreak; cover is drawn by onFirstPage callback
    story.append(Spacer(1, 1))
    story.append(PageBreak())

    # ==========================================
    # TABLE OF CONTENTS
    # ==========================================
    story.append(Paragraph('Sommaire', styles['h1']))
    story.append(Spacer(1, 8))

    toc_items = [
        ('1.', 'Se connecter au portail collaborateur'),
        ('2.', 'Tableau de bord - Vue d\'ensemble'),
        ('3.', 'Gestion des commandes'),
        ('4.', 'Workflow des 14 etapes'),
        ('5.', 'Mettre a jour le statut d\'une commande'),
        ('6.', 'Uploader des documents'),
        ('7.', 'Etapes speciales : achat et reception'),
        ('8.', 'Contacter un client via WhatsApp'),
        ('9.', 'Gestion des vehicules'),
        ('10.', 'Gestion des lots (batches)'),
        ('11.', 'Notifications et temps reel'),
        ('12.', 'Aide-memoire rapide'),
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

    # ==========================================
    # SECTION 1: CONNEXION
    # ==========================================
    story.append(Paragraph('1. Se connecter au portail', styles['h1']))
    story.append(Paragraph(
        'Le portail collaborateur est accessible a l\'adresse <b>/collaborator/login</b>. '
        'Seuls les utilisateurs ayant le role <b>collaborator</b>, <b>admin</b> ou <b>super_admin</b> '
        'peuvent y acceder.',
        styles['body']
    ))
    story.append(Spacer(1, 6))

    story.append(make_numbered_step(1, 'Acceder a la page de connexion',
        'Rendez-vous sur https://drivebyafrica.com/collaborator/login'))
    story.append(make_numbered_step(2, 'Saisir vos identifiants',
        'Entrez votre adresse email et votre mot de passe fournis par l\'administrateur.'))
    story.append(make_numbered_step(3, 'Choisir votre langue',
        'En haut de la page, selectionnez votre langue : English, Francais ou Chinois.'))
    story.append(make_numbered_step(4, 'Acceder au tableau de bord',
        'Apres connexion, vous etes redirige vers le tableau de bord collaborateur.'))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        'Votre session reste active tant que vous ne vous deconnectez pas. '
        'Utilisez le bouton "Logout" dans la barre laterale pour vous deconnecter proprement.'
    ))

    story.append(PageBreak())

    # ==========================================
    # SECTION 2: TABLEAU DE BORD
    # ==========================================
    story.append(Paragraph('2. Tableau de bord', styles['h1']))
    story.append(Paragraph(
        'Le tableau de bord vous donne une vue d\'ensemble de l\'activite en cours. '
        'Il se met a jour en temps reel.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Statistiques affichees', styles['h2']))

    stats_data = [
        ['Indicateur', 'Description'],
        ['Nouvelles commandes (aujourd\'hui)', 'Nombre de commandes recues aujourd\'hui'],
        ['Commandes traitees', 'Commandes dont le statut a ete mis a jour aujourd\'hui'],
        ['Commandes terminees', 'Commandes passees au statut "Livre" aujourd\'hui'],
        ['Actions en attente', 'Commandes necessitant une intervention (premiers statuts)'],
        ['En cours', 'Commandes entre acompte paye et douane export'],
        ['En transit', 'Commandes en transit ou au port'],
        ['En mer', 'Commandes en mer, docs prets, ou en douane'],
        ['Terminees', 'Commandes pretes au retrait ou livrees'],
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
    story.append(Paragraph('Commandes recentes', styles['h2']))
    story.append(Paragraph(
        'Les 5 dernieres commandes mises a jour sont affichees avec leur statut actuel, '
        'le vehicule concerne et le temps ecoule depuis la derniere modification. '
        'Cliquez sur une commande pour acceder directement a son detail.',
        styles['body']
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph('Notifications', styles['h2']))
    story.append(Paragraph(
        'Le panneau de notifications affiche les 10 derniers evenements. '
        'Les notifications non lues sont mises en evidence. Cliquez dessus pour les marquer comme lues '
        'et etre redirige vers la commande concernee.',
        styles['body']
    ))

    story.append(PageBreak())

    # ==========================================
    # SECTION 3: GESTION DES COMMANDES
    # ==========================================
    story.append(Paragraph('3. Gestion des commandes', styles['h1']))
    story.append(Paragraph(
        'La page Commandes est le coeur de votre activite quotidienne. Elle vous permet de suivre, '
        'mettre a jour et gerer l\'ensemble des commandes.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Liste des commandes', styles['h2']))
    story.append(Paragraph(
        'La liste affiche toutes les commandes avec les informations suivantes :',
        styles['body']
    ))

    list_items = [
        '<b>Numero de commande</b> et date de derniere mise a jour',
        '<b>Vehicule</b> : photo, marque, modele, annee et prix',
        '<b>Client</b> : nom et bouton WhatsApp pour le contacter',
        '<b>Destination</b> : drapeau du pays et nom de la destination',
        '<b>Progression</b> : barre de progression et statut actuel',
        '<b>ETA</b> : date estimee d\'arrivee',
    ]
    for item in list_items:
        story.append(Paragraph(f'&bull; {item}', ParagraphStyle('list', parent=styles['body'], leftIndent=15)))

    story.append(Spacer(1, 10))
    story.append(Paragraph('Recherche et filtres', styles['h2']))
    story.append(Paragraph(
        'Utilisez la <b>barre de recherche</b> pour trouver une commande par numero, marque ou modele de vehicule. '
        'Le <b>filtre par statut</b> permet d\'afficher uniquement les commandes a un stade precis du processus.',
        styles['body']
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph('Detail d\'une commande', styles['h2']))
    story.append(Paragraph(
        'Cliquez sur une commande pour ouvrir sa fiche detaillee. Vous y trouverez :',
        styles['body']
    ))

    detail_items = [
        '<b>Timeline visuelle</b> des 14 etapes avec progression',
        '<b>Formulaire de mise a jour</b> du statut avec note et ETA',
        '<b>Section documents</b> pour uploader les pieces requises',
        '<b>Historique d\'activite</b> montrant qui a modifie quoi et quand',
        '<b>Partenaire transport</b> assigne (si applicable)',
        '<b>Informations client</b> et destination',
    ]
    for item in detail_items:
        story.append(Paragraph(f'&bull; {item}', ParagraphStyle('list', parent=styles['body'], leftIndent=15)))

    story.append(PageBreak())

    # ==========================================
    # SECTION 4: WORKFLOW 14 ETAPES
    # ==========================================
    story.append(Paragraph('4. Workflow des 14 etapes', styles['h1']))
    story.append(Paragraph(
        'Chaque commande suit un processus en 14 etapes, de la reception de l\'acompte '
        'jusqu\'a la livraison finale. Certaines etapes necessitent des documents ou des actions specifiques.',
        styles['body']
    ))
    story.append(Spacer(1, 10))

    story.append(make_status_table())

    story.append(Spacer(1, 10))
    story.append(make_tip_box(
        'Les documents marques "(interne)" ne sont <b>pas visibles par le client</b>. '
        'Ils sont reserves a l\'equipe admin et collaborateurs pour le suivi interne.',
    ))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        'L\'etape 6 "Reception vehicule" est <b>invisible pour le client</b> dans son suivi. '
        'C\'est une etape interne permettant d\'attribuer un transitaire a la commande.',
        'warn'
    ))

    story.append(PageBreak())

    # ==========================================
    # SECTION 5: METTRE A JOUR UN STATUT
    # ==========================================
    story.append(Paragraph('5. Mettre a jour le statut', styles['h1']))
    story.append(Paragraph(
        'Pour faire avancer une commande dans le workflow, vous devez mettre a jour son statut. '
        'Voici la procedure etape par etape :',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(make_numbered_step(1, 'Ouvrir la commande',
        'Depuis la liste, cliquez sur le bouton "View" ou sur la ligne de la commande.'))
    story.append(make_numbered_step(2, 'Selectionner le nouveau statut',
        'Dans le dropdown "Update Status", choisissez l\'etape suivante du workflow.'))
    story.append(make_numbered_step(3, 'Ajouter une note (recommande)',
        'Saisissez une note explicative dans le champ texte. Elle sera visible dans l\'historique.'))
    story.append(make_numbered_step(4, 'Definir l\'ETA si necessaire',
        'Utilisez le selecteur de date pour indiquer la date d\'arrivee estimee.'))
    story.append(make_numbered_step(5, 'Cliquer sur "Update"',
        'Le statut est mis a jour immediatement. Une notification est envoyee au client '
        '(sauf pour les etapes internes).'))

    story.append(Spacer(1, 10))
    story.append(make_tip_box(
        'Le bouton "Mettre a jour" est desactive si vous n\'avez pas change le statut. '
        'Vous devez selectionner un statut different du statut actuel.',
        'info'
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph('Notifications automatiques', styles['h2']))
    story.append(Paragraph(
        'Lorsque vous mettez a jour le statut d\'une commande, le systeme envoie automatiquement '
        'une notification WhatsApp au client pour les etapes visibles. <b>Exception</b> : l\'etape '
        '"Reception vehicule" (etape 6) ne declenche <b>aucune notification</b> car c\'est une etape '
        'purement interne.',
        styles['body']
    ))

    story.append(PageBreak())

    # ==========================================
    # SECTION 6: DOCUMENTS
    # ==========================================
    story.append(Paragraph('6. Uploader des documents', styles['h1']))
    story.append(Paragraph(
        'Chaque etape du workflow peut necessiter des documents specifiques (photos, PDF, liens). '
        'La section "Documents" dans le detail de la commande vous montre ce qui est attendu.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Types de documents', styles['h2']))

    doc_types = [
        ['Type', 'Formats acceptes', 'Exemple'],
        ['Images', 'JPG, PNG', 'Photos vehicule, plomb container'],
        ['Documents', 'PDF, DOC, DOCX', 'Factures, rapports, BL'],
        ['Liens URL', 'URL complete', 'Lien de suivi container'],
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
    story.append(Paragraph('Procedure d\'upload', styles['h2']))
    story.append(make_numbered_step(1, 'Ouvrir la section Documents',
        'Dans le detail de la commande, reperer la section "Documents" sous le formulaire de statut.'))
    story.append(make_numbered_step(2, 'Identifier le document requis',
        'Chaque type de document attendu est liste avec son nom et une description.'))
    story.append(make_numbered_step(3, 'Cliquer sur Upload',
        'Selectionnez le fichier depuis votre ordinateur. La progression s\'affiche en temps reel.'))
    story.append(make_numbered_step(4, 'Verifier l\'upload',
        'Le document apparait dans la liste avec un lien de telechargement.'))

    story.append(Spacer(1, 10))
    story.append(Paragraph('Visibilite des documents', styles['h2']))
    story.append(Paragraph(
        'Chaque document a un indicateur de visibilite :',
        styles['body']
    ))
    story.append(Paragraph(
        '&bull; <b>Visible par le client</b> : le client peut telecharger ce document depuis son espace',
        ParagraphStyle('list', parent=styles['body'], leftIndent=15)
    ))
    story.append(Paragraph(
        '&bull; <b>Admin only</b> : reserve a l\'equipe interne, le client ne le voit pas',
        ParagraphStyle('list', parent=styles['body'], leftIndent=15)
    ))
    story.append(Paragraph(
        '&bull; <b>Auto</b> : genere automatiquement par le systeme (ex: facture Driveby)',
        ParagraphStyle('list', parent=styles['body'], leftIndent=15)
    ))

    story.append(PageBreak())

    # ==========================================
    # SECTION 7: ETAPES SPECIALES
    # ==========================================
    story.append(Paragraph('7. Etapes speciales', styles['h1']))

    # Vehicle Purchased
    story.append(Paragraph('Etape 5 : Vehicule achete', styles['h2']))
    story.append(Paragraph(
        'Lorsque vous passez une commande au statut <b>"Vehicule achete"</b>, un champ supplementaire '
        'apparait pour saisir le <b>prix d\'achat reel</b> en USD.',
        styles['body']
    ))
    story.append(Spacer(1, 6))

    purchase_data = [
        [Paragraph(
            '<b>Prix d\'achat reel (USD)</b><br/>'
            'Ce champ est <b>obligatoire</b>. Il permet de calculer la marge reelle sur la commande.<br/>'
            'Cette information est strictement confidentielle et n\'est visible que par '
            'les administrateurs et collaborateurs.',
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

    # Vehicle Received
    story.append(Paragraph('Etape 6 : Reception du vehicule', styles['h2']))
    story.append(Paragraph(
        'L\'etape <b>"Reception vehicule"</b> est une etape interne, invisible pour le client. '
        'Elle permet d\'attribuer un <b>partenaire de transport</b> (transitaire) a la commande.',
        styles['body']
    ))
    story.append(Spacer(1, 6))

    story.append(make_numbered_step(1, 'Selectionner le statut "Reception vehicule"',
        'Le dropdown des partenaires de transport apparait automatiquement.'))
    story.append(make_numbered_step(2, 'Choisir le transitaire',
        'Les partenaires sont groupes par pays de destination. Ceux couvrant le pays de la commande '
        'apparaissent en priorite.'))
    story.append(make_numbered_step(3, 'Valider la mise a jour',
        'Le transitaire est sauvegarde et affiche dans le detail de la commande.'))

    story.append(Spacer(1, 10))
    story.append(make_tip_box(
        'Si aucun partenaire ne couvre le pays de destination, un message d\'avertissement s\'affiche. '
        'Vous pouvez tout de meme selectionner un partenaire dans la liste "Autres partenaires".',
        'warn'
    ))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        'L\'attribution du transitaire est enregistree dans l\'historique avec le nom du partenaire '
        'et la date d\'attribution. Pas de notification WhatsApp envoyee pour cette etape.'
    ))

    story.append(PageBreak())

    # ==========================================
    # SECTION 8: WHATSAPP
    # ==========================================
    story.append(Paragraph('8. Contacter un client', styles['h1']))
    story.append(Paragraph(
        'Vous pouvez contacter directement un client via WhatsApp depuis l\'application. '
        'Le message est pre-rempli avec le nom du client et le numero de commande.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Depuis la liste des commandes', styles['h3']))
    story.append(Paragraph(
        'Cliquez sur l\'icone WhatsApp (vert) a cote du nom du client dans la colonne "Customer".',
        styles['body']
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph('Depuis le detail d\'une commande', styles['h3']))
    story.append(Paragraph(
        'Un bouton "Contact" est disponible dans la section "Customer" en bas du detail.',
        styles['body']
    ))

    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        'Le numero WhatsApp est formate automatiquement. Si le client n\'a pas de numero WhatsApp '
        'enregistre, le bouton ne s\'affiche pas.',
        'info'
    ))

    story.append(Spacer(1, 16))

    # ==========================================
    # SECTION 9: VEHICULES
    # ==========================================
    story.append(Paragraph('9. Gestion des vehicules', styles['h1']))
    story.append(Paragraph(
        'La section "Vehicles" vous permet de gerer les vehicules que vous proposez. '
        'Vous pouvez ajouter, modifier et supprimer des vehicules.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Ajouter un vehicule', styles['h2']))
    story.append(Paragraph(
        'Remplissez le formulaire avec les informations du vehicule : marque, modele, annee, prix, '
        'kilometrage, carburant, transmission et photos. Le vehicule sera soumis a validation '
        'par l\'administrateur.',
        styles['body']
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph('Statuts des vehicules', styles['h2']))

    veh_status = [
        ['Statut', 'Signification'],
        ['Pending', 'En attente de validation par l\'admin'],
        ['Approved', 'Valide et visible sur le site'],
        ['Rejected', 'Refuse par l\'admin (raison affichee)'],
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

    # ==========================================
    # SECTION 10: LOTS
    # ==========================================
    story.append(Paragraph('10. Gestion des lots', styles['h1']))
    story.append(Paragraph(
        'La section "Batches" permet de gerer des lots de vehicules identiques '
        '(meme marque, modele, annee) pour la vente en gros.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        'Vous pouvez creer un lot en specifiant la quantite disponible, le prix unitaire, '
        'et les details du vehicule. Le statut du lot suit le meme workflow que les vehicules '
        'individuels (pending, approved, rejected).',
        styles['body']
    ))

    story.append(Spacer(1, 16))

    # ==========================================
    # SECTION 11: NOTIFICATIONS
    # ==========================================
    story.append(Paragraph('11. Notifications et temps reel', styles['h1']))
    story.append(Paragraph(
        'L\'application fonctionne en <b>temps reel</b>. Lorsqu\'un autre collaborateur ou un '
        'administrateur met a jour une commande, votre ecran se rafraichit automatiquement.',
        styles['body']
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Cloche de notifications', styles['h2']))
    story.append(Paragraph(
        'En haut a droite, la cloche affiche le nombre de notifications non lues. '
        'Cliquez dessus pour ouvrir le panneau :',
        styles['body']
    ))

    notif_items = [
        'Les notifications non lues ont un fond bleu',
        'Cliquez sur une notification pour la marquer comme lue',
        'Cliquez sur "Mark all as read" pour tout marquer d\'un coup',
        'Chaque notification peut contenir un lien vers la commande concernee',
    ]
    for item in notif_items:
        story.append(Paragraph(f'&bull; {item}', ParagraphStyle('list', parent=styles['body'], leftIndent=15)))

    story.append(Spacer(1, 10))
    story.append(Paragraph('Badges collaborateurs', styles['h2']))
    story.append(Paragraph(
        'Chaque modification est identifiee par un badge de couleur unique attribue a chaque '
        'collaborateur. Cela permet de savoir qui a effectue la derniere mise a jour sur une commande.',
        styles['body']
    ))

    story.append(PageBreak())

    # ==========================================
    # SECTION 12: AIDE-MEMOIRE
    # ==========================================
    story.append(Paragraph('12. Aide-memoire rapide', styles['h1']))
    story.append(Spacer(1, 8))

    story.append(make_shortcut_table())

    story.append(Spacer(1, 16))

    story.append(Paragraph('Routine quotidienne recommandee', styles['h2']))
    story.append(Spacer(1, 6))

    story.append(make_numbered_step(1, 'Consulter le tableau de bord',
        'Verifier les statistiques du jour et les commandes en attente d\'action.'))
    story.append(make_numbered_step(2, 'Traiter les commandes prioritaires',
        'Commencer par les commandes aux premiers stades (acompte paye, vehicule bloque).'))
    story.append(make_numbered_step(3, 'Uploader les documents manquants',
        'Verifier que tous les documents requis sont uploades pour chaque etape.'))
    story.append(make_numbered_step(4, 'Mettre a jour les statuts',
        'Faire avancer les commandes dont les conditions sont remplies.'))
    story.append(make_numbered_step(5, 'Contacter les clients si besoin',
        'Utiliser WhatsApp pour repondre aux questions ou informer d\'un changement.'))
    story.append(make_numbered_step(6, 'Verifier les notifications',
        'S\'assurer qu\'aucune notification importante n\'a ete manquee.'))

    story.append(Spacer(1, 16))

    # Final box
    final_data = [[Paragraph(
        '<b>Besoin d\'aide ?</b><br/><br/>'
        'Contactez l\'administrateur Driveby Africa pour toute question technique '
        'ou demande d\'acces. Pour les problemes urgents, utilisez le canal interne de communication.',
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

    # Build the PDF
    doc.build(story, onFirstPage=draw_cover, onLaterPages=header_footer)
    print(f'PDF generated: {output_path}')


if __name__ == '__main__':
    build_guide()
