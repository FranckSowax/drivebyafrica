#!/usr/bin/env python3
"""Generate the Driveby Africa Admin Guide PDF - French Version."""

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
JEWEL = HexColor('#1B7A43')
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
        bg, border, icon = HexColor('#E8F5E9'), HexColor('#4CAF50'), 'ASTUCE'
        style = styles['tip_text']
    elif box_type == 'warn':
        bg, border, icon = HexColor('#FFF8E1'), HexColor('#FF9800'), 'IMPORTANT'
        style = styles['warn_text']
    else:
        bg, border, icon = HexColor('#E3F2FD'), HexColor('#2196F3'), 'INFO'
        style = ParagraphStyle('info_text', parent=styles['tip_text'], textColor=HexColor('#0D47A1'))
    data = [[Paragraph(f'<b>{icon} :</b> {text}', style)]]
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
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 25 * mm, "Guide de l'Administrateur")
    c.setFillColor(HexColor('#FFCCAA'))
    c.setFont('Helvetica', 16)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 + 5 * mm, 'Gestion de la plateforme')
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 10 * mm, "et administration complete")
    c.setStrokeColor(MANDARIN)
    c.setLineWidth(2)
    c.line(WIDTH / 2 - 40 * mm, HEIGHT / 2 - 25 * mm, WIDTH / 2 + 40 * mm, HEIGHT / 2 - 25 * mm)
    c.setFillColor(HexColor('#888888'))
    c.setFont('Helvetica', 11)
    c.drawCentredString(WIDTH / 2, HEIGHT / 2 - 40 * mm, 'Version 2.0 - Fevrier 2026')
    c.setFillColor(HexColor('#666666'))
    c.setFont('Helvetica', 9)
    c.drawCentredString(WIDTH / 2, 25 * mm, 'Document interne - Usage reserve aux administrateurs Driveby Africa')
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
    c.drawString(2 * cm, HEIGHT - 1.3 * cm, 'Driveby Africa - Guide Administrateur')
    c.drawRightString(WIDTH - 2 * cm, HEIGHT - 1.3 * cm, 'v2.0')
    c.setStrokeColor(BORDER_COLOR)
    c.setLineWidth(0.5)
    c.line(2 * cm, 1.5 * cm, WIDTH - 2 * cm, 1.5 * cm)
    c.setFillColor(HexColor('#999999'))
    c.setFont('Helvetica', 8)
    c.drawString(2 * cm, 1 * cm, 'Document confidentiel')
    c.drawRightString(WIDTH - 2 * cm, 1 * cm, f'Page {doc.page}')
    c.restoreState()


def bullet(text):
    return Paragraph(f'&bull; {text}', ParagraphStyle('list', parent=styles['body'], leftIndent=15))


def build_guide():
    output_path = '/Users/user/Downloads/drivebyafrica-main/public/guides/Guide-Admin-Driveby-Africa.pdf'
    doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=2.2 * cm, bottomMargin=2 * cm, leftMargin=2 * cm, rightMargin=2 * cm)
    story = []

    # Cover
    story.append(Spacer(1, 1))
    story.append(PageBreak())

    # TOC
    story.append(Paragraph('Sommaire', styles['h1']))
    story.append(Spacer(1, 8))
    toc = [
        ('1.', 'Connexion et roles'),
        ('2.', "Tableau de bord et KPI"),
        ('3.', 'Gestion des vehicules'),
        ('4.', 'Synchronisation des sources'),
        ('5.', 'Gestion des commandes'),
        ('6.', 'Gestion des devis'),
        ('7.', 'Reassignation de vehicules'),
        ('8.', 'Gestion des utilisateurs'),
        ('9.', 'Routes et couts de transport'),
        ('10.', 'Partenaires transport (transitaires)'),
        ('11.', 'Gestion des devises'),
        ('12.', 'Lots de vehicules (batches)'),
        ('13.', 'Notifications et messages'),
        ('14.', 'Parametres de la plateforme'),
        ('15.', 'Analytiques et profits'),
    ]
    for num, title in toc:
        data = [[Paragraph(f'<b>{num}</b>', ParagraphStyle('n', parent=styles['toc_item'], textColor=MANDARIN)),
                 Paragraph(title, styles['toc_item'])]]
        t = Table(data, colWidths=[30, WIDTH - 4.5 * cm])
        t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2), ('LINEBELOW', (0, 0), (-1, -1), 0.3, HexColor('#EEEEEE'))]))
        story.append(t)
    story.append(PageBreak())

    # ===== SECTION 1: CONNEXION =====
    story.append(Paragraph('1. Connexion et roles', styles['h1']))
    story.append(Paragraph(
        "Le portail administrateur est accessible a <b>/admin/login</b>. "
        "Seuls les utilisateurs avec le role <b>admin</b> ou <b>super_admin</b> peuvent y acceder.",
        styles['body']))
    story.append(Spacer(1, 6))
    story.append(Paragraph('Roles disponibles', styles['h2']))
    story.append(make_table(
        ['Role', 'Acces', 'Description'],
        [['User', 'Site public', 'Client standard - navigation et devis'],
         ['Collaborator', 'Portail collab', 'Gestion commandes, vehicules, lots'],
         ['Admin', 'Portail admin', 'Acces complet a toutes les fonctionnalites'],
         ['Super Admin', 'Portail admin', 'Admin + gestion des roles et parametres']],
        [80, 100, 285]))
    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        "La session reste active 7 jours via un cookie (dba-auth-marker). "
        "Utilisez le bouton Logout dans la barre laterale pour vous deconnecter."))
    story.append(PageBreak())

    # ===== SECTION 2: DASHBOARD =====
    story.append(Paragraph('2. Tableau de bord et KPI', styles['h1']))
    story.append(Paragraph(
        "Le tableau de bord affiche en temps reel les indicateurs cles de la plateforme.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Indicateurs principaux', styles['h2']))
    story.append(make_table(
        ['KPI', 'Description'],
        [['Vehicules totaux', 'Nombre de vehicules en base (toutes sources)'],
         ['Utilisateurs', 'Nombre total d\'utilisateurs inscrits'],
         ['Devis', 'Nombre total de devis generes'],
         ['Commandes', 'Nombre total de commandes en cours'],
         ['Depots collectes', 'Total des acomptes recus (USD)'],
         ['Valeur commandes', 'Total des commandes en FCFA'],
         ['Taux d\'acceptation', 'Pourcentage de devis acceptes']],
        [140, 325]))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Graphiques et tendances', styles['h2']))
    story.append(bullet('<b>Courbes temporelles</b> : utilisateurs et devis sur 7j/30j/90j'))
    story.append(bullet('<b>Inventaire vehicules</b> : evolution par source (Coree, Chine, Dubai)'))
    story.append(bullet('<b>Destinations populaires</b> : top pays avec drapeaux'))
    story.append(bullet('<b>Marques populaires</b> : vehicules les plus demandes'))
    story.append(bullet('<b>Comparaison mensuelle</b> : barres utilisateurs/devis/vehicules'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("Vous pouvez enregistrer manuellement un snapshot de l'inventaire vehicules pour le suivi historique.", 'info'))
    story.append(PageBreak())

    # ===== SECTION 3: VEHICULES =====
    story.append(Paragraph('3. Gestion des vehicules', styles['h1']))
    story.append(Paragraph(
        "La section Vehicules comprend trois onglets : <b>Statistiques</b>, <b>Vehicules</b> et <b>Synchronisation</b>.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Statistiques', styles['h2']))
    story.append(bullet('Nombre total par statut : disponible, reserve, vendu, en attente'))
    story.append(bullet('Repartition par source : Coree, Chine, Dubai'))
    story.append(bullet('Vehicules visibles vs caches'))
    story.append(bullet('Prix moyen des vehicules'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Gestion des vehicules', styles['h2']))
    story.append(Paragraph('La liste permet de rechercher, filtrer et gerer les vehicules :', styles['body']))
    story.append(bullet('<b>Recherche</b> par marque, modele ou ID source'))
    story.append(bullet('<b>Filtres</b> : statut, visibilite, fourchette de prix'))
    story.append(bullet('<b>Actions groupees</b> : mise a jour en masse du statut, visibilite ou prix'))
    story.append(bullet('<b>Suppression groupee</b> : retirer plusieurs vehicules'))
    story.append(bullet('<b>Ajout manuel</b> : creer un vehicule avec tous les details'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("L'ajout manuel permet de saisir marque, modele, annee, source, prix, photos et tous les attributs techniques.", 'info'))
    story.append(PageBreak())

    # ===== SECTION 4: SYNC =====
    story.append(Paragraph('4. Synchronisation des sources', styles['h1']))
    story.append(Paragraph(
        "L'onglet Synchronisation permet d'importer les vehicules depuis les APIs externes : "
        "<b>Encar</b> (Coree), <b>CHE168/Dongchedi</b> (Chine), <b>Dubicars</b> (Dubai).",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_table(
        ['Mode', 'Description', 'Usage'],
        [['Full Sync', 'Import complet de tous les vehicules', 'Premiere utilisation ou resync totale'],
         ['Change Sync', 'Import incremental (nouveaux/modifies)', 'Utilisation quotidienne']],
        [90, 200, 175]))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Informations affichees :', styles['h3']))
    story.append(bullet('Derniere synchronisation : date et heure'))
    story.append(bullet('Statut : en cours, reussi, echoue'))
    story.append(bullet('Vehicules ajoutes, mis a jour, supprimes'))
    story.append(bullet('Historique complet des synchronisations'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("Privilegiez le Change Sync pour les mises a jour quotidiennes. Le Full Sync peut prendre plus de temps.", 'warn'))
    story.append(PageBreak())

    # ===== SECTION 5: COMMANDES =====
    story.append(Paragraph('5. Gestion des commandes', styles['h1']))
    story.append(Paragraph(
        "La gestion des commandes suit un workflow en 14 etapes (identique au guide collaborateur). "
        "L'administrateur dispose de fonctionnalites supplementaires.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Cartes de synthese', styles['h2']))
    story.append(bullet('Acomptes payes / Vehicules achetes / En transit / En mer / Livres'))
    story.append(bullet('Total des depots en USD'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Detail commande (modal)', styles['h2']))
    story.append(bullet('<b>Timeline visuelle</b> des 14 etapes'))
    story.append(bullet('<b>Formulaire de mise a jour</b> : statut, note, ETA, partenaire transport'))
    story.append(bullet('<b>Section documents</b> : upload par etape'))
    story.append(bullet('<b>Resume financier</b> : prix vehicule, transport, assurance, total, acompte, solde'))
    story.append(bullet('<b>Historique d\'activite</b> : qui a modifie quoi et quand'))
    story.append(bullet('<b>Badge collaborateur</b> : identification du dernier intervenant'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box(
        "Le statut 'Reception vehicule' (etape 6) est invisible pour le client et necessite l'attribution d'un transitaire.",
        'warn'))
    story.append(PageBreak())

    # ===== SECTION 6: DEVIS =====
    story.append(Paragraph('6. Gestion des devis', styles['h1']))
    story.append(Paragraph(
        "La page Devis affiche le pipeline complet avec des statistiques en temps reel.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Pipeline des devis', styles['h2']))
    story.append(make_table(
        ['Statut', 'Description'],
        [['Non-valide', 'Devis en attente de validation admin'],
         ['En attente de paiement', 'Devis valide, en attente du depot client'],
         ['Accepte', 'Depot recu, commande en cours'],
         ['Refuse', 'Devis refuse par le client ou l\'admin'],
         ['Reassigne', 'Vehicule change, nouveau devis propose'],
         ['Prix envoye', 'Prix personnalise envoye au client']],
        [140, 325]))
    story.append(Spacer(1, 10))
    story.append(Paragraph('Actions sur un devis', styles['h2']))
    story.append(make_numbered_step(1, 'Valider un devis', 'Verifier les details et confirmer le prix.'))
    story.append(make_numbered_step(2, 'Definir un prix personnalise',
        'Saisir un prix en USD, conversion auto en FCFA. Ajouter une note optionnelle.'))
    story.append(make_numbered_step(3, 'Accepter ou refuser',
        'Changer le statut du devis apres verification.'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("Le prix personnalise est converti automatiquement au taux de change USD/XAF en vigueur."))
    story.append(PageBreak())

    # ===== SECTION 7: REASSIGNATION =====
    story.append(Paragraph('7. Reassignation de vehicules', styles['h1']))
    story.append(Paragraph(
        "Quand un vehicule n'est plus disponible (vendu, indisponible, conflit de priorite), "
        "vous pouvez reassigner le devis a un vehicule similaire.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_numbered_step(1, 'Selectionner la raison',
        'Vendu, indisponible, conflit de priorite, changement de prix, autre.'))
    story.append(make_numbered_step(2, 'Vehicules suggeres automatiquement',
        'Le systeme propose 3 vehicules similaires (marque/modele/annee/prix) avec scores de similarite.'))
    story.append(make_numbered_step(3, 'Confirmer la reassignation',
        'Le client est notifie du changement et peut accepter ou refuser.'))
    story.append(Spacer(1, 8))
    story.append(Paragraph("L'onglet <b>Reassignations</b> dans les devis affiche l'historique complet des reassignations.", styles['body']))
    story.append(PageBreak())

    # ===== SECTION 8: UTILISATEURS =====
    story.append(Paragraph('8. Gestion des utilisateurs', styles['h1']))
    story.append(Paragraph(
        "La page Utilisateurs affiche tous les comptes avec leurs statistiques.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Informations affichees', styles['h2']))
    story.append(bullet('<b>Profil</b> : nom, avatar, telephone, WhatsApp, pays'))
    story.append(bullet('<b>Role</b> : badge colore (User, Admin, Super Admin, Collaborator)'))
    story.append(bullet('<b>Verification</b> : statut de verification du compte'))
    story.append(bullet('<b>Statistiques</b> : nombre de devis, commandes, depenses totales'))
    story.append(bullet('<b>Date d\'inscription</b> et derniere activite'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Fonctionnalites', styles['h2']))
    story.append(bullet('Recherche par nom, telephone, WhatsApp ou pays'))
    story.append(bullet('Tri par colonnes'))
    story.append(bullet('Profil detaille en modal'))
    story.append(bullet('Pagination (20 utilisateurs par page)'))
    story.append(PageBreak())

    # ===== SECTION 9: TRANSPORT =====
    story.append(Paragraph('9. Routes et couts de transport', styles['h1']))
    story.append(Paragraph(
        "La section Transport permet de gerer les 65+ destinations africaines et leurs couts d'expedition.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Gestion des routes', styles['h2']))
    story.append(bullet('<b>Recherche</b> par destination ou pays'))
    story.append(bullet('<b>Couts editables</b> (USD) : Coree, Chine, Dubai pour container 20ft'))
    story.append(bullet('<b>Option 40ft</b> : couts optionnels pour container 40ft'))
    story.append(bullet('<b>Activer/Desactiver</b> des routes'))
    story.append(bullet('<b>Edition groupee</b> : modifier plusieurs routes simultanment'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Onglets supplementaires', styles['h2']))
    story.append(bullet('<b>Partenaires</b> : gestion des compagnies de transport'))
    story.append(bullet('<b>Comparaison</b> : vue cote a cote des couts par source'))
    story.append(PageBreak())

    # ===== SECTION 10: TRANSITAIRES =====
    story.append(Paragraph('10. Partenaires transport', styles['h1']))
    story.append(Paragraph(
        "La page Transitaires permet de gerer les partenaires logistiques.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Informations par transitaire', styles['h2']))
    story.append(make_table(
        ['Champ', 'Description'],
        [['Nom / Societe', 'Identite du partenaire'],
         ['Pays / Port', 'Zone de couverture'],
         ['Contact', 'Telephone, WhatsApp, email, adresse'],
         ['Specialites', 'Tags (ex: conteneur, roulier, vehicule)'],
         ['Langues', 'Langues parlees par le partenaire'],
         ['Note / Avis', 'Note moyenne et nombre d\'avis'],
         ['Statut', 'Actif / Verifie']],
        [120, 345]))
    story.append(Spacer(1, 8))
    story.append(bullet('Ajouter, modifier, supprimer des transitaires'))
    story.append(bullet('Filtrer par pays ou port'))
    story.append(bullet('Rechercher par nom ou societe'))
    story.append(PageBreak())

    # ===== SECTION 11: DEVISES =====
    story.append(Paragraph('11. Gestion des devises', styles['h1']))
    story.append(Paragraph(
        "La page Devises permet de configurer les taux de change et les devises actives.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Fonctionnalites', styles['h2']))
    story.append(bullet('<b>Taux de change</b> : modifier le taux par rapport au USD'))
    story.append(bullet('<b>Historique</b> : ancien taux, nouveau taux, date, notes'))
    story.append(bullet('<b>Activer/Desactiver</b> des devises'))
    story.append(bullet('<b>Ordre d\'affichage</b> : personnaliser l\'ordre'))
    story.append(bullet('<b>Drapeaux</b> : identification visuelle par pays'))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("Les taux de change affectent directement les prix affiches aux clients. Verifiez regulierement leur exactitude.", 'warn'))
    story.append(PageBreak())

    # ===== SECTION 12: BATCHES =====
    story.append(Paragraph('12. Lots de vehicules (batches)', styles['h1']))
    story.append(Paragraph(
        "La section Batches permet de gerer les soumissions de lots par les collaborateurs.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Workflow de validation', styles['h2']))
    story.append(make_numbered_step(1, 'Soumission par un collaborateur',
        'Le collaborateur cree un lot avec quantite, prix unitaire et details vehicule.'))
    story.append(make_numbered_step(2, 'Revue par l\'admin',
        'Verifier les details du lot : vehicules, prix, description.'))
    story.append(make_numbered_step(3, 'Approuver ou refuser',
        'Approuver rend les vehicules visibles. Refuser avec une note explicative.'))
    story.append(Spacer(1, 8))
    story.append(make_table(
        ['Statut', 'Action'],
        [['Pending', 'En attente de revue admin'],
         ['Approved', 'Vehicules visibles sur le site'],
         ['Rejected', 'Refuse avec motif affiche au collaborateur']],
        [120, 345]))
    story.append(PageBreak())

    # ===== SECTION 13: NOTIFICATIONS/MESSAGES =====
    story.append(Paragraph('13. Notifications et messages', styles['h1']))
    story.append(Spacer(1, 6))
    story.append(Paragraph('Notifications', styles['h2']))
    story.append(Paragraph("Le panneau Notifications centralise tous les evenements de la plateforme.", styles['body']))
    story.append(bullet('<b>Types</b> : nouvelles commandes, devis, paiements, mises a jour'))
    story.append(bullet('<b>Priorites</b> : Urgent, Haute, Normale, Basse'))
    story.append(bullet('<b>Actions</b> : marquer comme lu, supprimer, voir l\'entite liee'))
    story.append(bullet('<b>Filtres</b> : par priorite, non lues uniquement'))
    story.append(Spacer(1, 12))
    story.append(Paragraph('Messages / Chat', styles['h2']))
    story.append(Paragraph("L'interface Messages permet de communiquer avec les clients.", styles['body']))
    story.append(bullet('<b>Liste de conversations</b> avec apercu du dernier message'))
    story.append(bullet('<b>Filtres</b> : Active, En attente, Fermee'))
    story.append(bullet('<b>Interface de chat</b> : historique complet, envoi de reponse'))
    story.append(bullet('<b>Types de messages</b> : utilisateur (bleu), bot (gris), agent (vert)'))
    story.append(bullet('<b>Contact WhatsApp</b> direct depuis la conversation'))
    story.append(PageBreak())

    # ===== SECTION 14: PARAMETRES =====
    story.append(Paragraph('14. Parametres de la plateforme', styles['h1']))
    story.append(Paragraph("La page Parametres permet de configurer la plateforme.", styles['body']))
    story.append(Spacer(1, 8))
    story.append(make_table(
        ['Categorie', 'Options'],
        [['General', 'Nom du site, description, devise par defaut, langue, fuseau horaire'],
         ['Contact', 'Email, telephone, numero WhatsApp'],
         ['Notifications', 'Activer/desactiver email et WhatsApp'],
         ['Maintenance', 'Activer/desactiver le mode maintenance']],
        [120, 345]))
    story.append(Spacer(1, 8))
    story.append(make_tip_box("Le mode maintenance affiche une page d'indisponibilite aux visiteurs. Utilisez-le pour les mises a jour.", 'warn'))
    story.append(PageBreak())

    # ===== SECTION 15: ANALYTIQUES =====
    story.append(Paragraph('15. Analytiques et profits', styles['h1']))
    story.append(Paragraph(
        "La page Analytiques offre une vue detaillee de la rentabilite et des performances.",
        styles['body']))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Analyse des profits', styles['h2']))
    story.append(bullet('<b>Total commandes</b> avec donnees de prix'))
    story.append(bullet('<b>Prix Driveby vs prix source</b> : comparaison detaillee'))
    story.append(bullet('<b>Profit total</b> en USD'))
    story.append(bullet('<b>Pourcentage de marge moyen</b>'))
    story.append(bullet('<b>Repartition par source</b> : Coree, Chine, Dubai'))
    story.append(Spacer(1, 8))
    story.append(Paragraph('Donnees detaillees', styles['h2']))
    story.append(bullet('Liste de chaque commande avec prix d\'achat Driveby, prix source, profit'))
    story.append(bullet('Graphiques temporels : utilisateurs, devis, inventaire'))
    story.append(bullet('Taux de change en vigueur (USD/XAF)'))
    story.append(Spacer(1, 12))

    # Final box
    final_data = [[Paragraph(
        "<b>Support technique</b><br/><br/>"
        "Pour toute question sur l'administration de la plateforme, "
        "contactez l'equipe technique Driveby Africa. "
        "En cas d'urgence, utilisez le canal de communication interne.",
        ParagraphStyle('final', parent=styles['body'], alignment=TA_CENTER, fontSize=11)
    )]]
    t = Table(final_data, colWidths=[WIDTH - 4 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SECTION_BG), ('BOX', (0, 0), (-1, -1), 1.5, MANDARIN),
        ('LEFTPADDING', (0, 0), (-1, -1), 20), ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('TOPPADDING', (0, 0), (-1, -1), 16), ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('ROUNDEDCORNERS', [6, 6, 6, 6])]))
    story.append(t)

    doc.build(story, onFirstPage=draw_cover, onLaterPages=header_footer)
    print(f'PDF generated: {output_path}')


if __name__ == '__main__':
    build_guide()
