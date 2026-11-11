import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def set_cell_shading(cell, color_hex):
    """Set background color of a table cell."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set cell margins in dxa (1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}>'
                      f'<w:top w:w="{top}" w:type="dxa"/>'
                      f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
                      f'<w:left w:w="{left}" w:type="dxa"/>'
                      f'<w:right w:w="{right}" w:type="dxa"/>'
                      f'</w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
    """Set custom clean borders for a table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}>'
                        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
                        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
                        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
                        f'<w:insideV w:val="none"/>'
                        f'<w:left w:val="none"/>'
                        f'<w:right w:val="none"/>'
                        f'</w:tblBorders>')
    tblPr.append(borders)

def add_callout(doc, text_list, title="ข้อสังเกตสำคัญ", bg_color="F0FDF4", border_color="00A950"):
    """Create a beautiful callout box with a colored left border."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_shading(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=160)
    
    # Left border only
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}>'
                        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>'
                        f'<w:top w:val="none"/>'
                        f'<w:bottom w:val="none"/>'
                        f'<w:right w:val="none"/>'
                        f'</w:tcBorders>')
    cell._tc.get_or_add_tcPr().append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    run_title = p.add_run(f"📌 {title}\n")
    run_title.bold = True
    run_title.font.name = 'Cordia New'
    run_title.font.size = Pt(14)
    run_title.font.color.rgb = RGBColor(0, 100, 40) if border_color == "00A950" else RGBColor(160, 60, 0)
    
    for i, t in enumerate(text_list):
        p_item = cell.add_paragraph()
        p_item.paragraph_format.space_before = Pt(0)
        p_item.paragraph_format.space_after = Pt(2)
        p_item.paragraph_format.line_spacing = 1.15
        run = p_item.add_run(t)
        run.font.name = 'Cordia New'
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(40, 40, 40)
        
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def add_formula_box(doc, formula_text, note_text=""):
    """Create a stylized math / formula card."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_shading(cell, "F8FAFC")
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}>'
                        f'<w:left w:val="single" w:sz="18" w:space="0" w:color="2563EB"/>'
                        f'<w:top w:val="single" w:sz="6" w:space="0" w:color="E2E8F0"/>'
                        f'<w:bottom w:val="single" w:sz="6" w:space="0" w:color="E2E8F0"/>'
                        f'<w:right w:val="single" w:sz="6" w:space="0" w:color="E2E8F0"/>'
                        f'</w:tcBorders>')
    cell._tc.get_or_add_tcPr().append(borders)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    run_f = p.add_run(f"📐 สูตร:  {formula_text}")
    run_f.bold = True
    run_f.font.name = 'Cordia New'
    run_f.font.size = Pt(14)
    run_f.font.color.rgb = RGBColor(30, 58, 138)
    
    if note_text:
        p2 = cell.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2.paragraph_format.space_before = Pt(1)
        p2.paragraph_format.space_after = Pt(2)
        run_n = p2.add_run(note_text)
        run_n.font.name = 'Cordia New'
        run_n.font.size = Pt(12)
        run_n.font.italic = True
        run_n.font.color.rgb = RGBColor(100, 116, 139)
        
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def style_paragraph(p, font_name='Cordia New', font_size=14, bold=False, italic=False, color_rgb=(51,51,51), space_before=0, space_after=4, line_spacing=1.15):
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    for r in p.runs:
        r.font.name = font_name
        r.font.size = Pt(font_size)
        r.bold = bold
        r.italic = italic
        r.font.color.rgb = RGBColor(*color_rgb)

def add_header_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.font.name = 'Cordia New'
    r.font.size = Pt(18)
    r.bold = True
    r.font.color.rgb = RGBColor(0, 122, 59) # Brand Green
    return p

def add_header_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.font.name = 'Cordia New'
    r.font.size = Pt(15)
    r.bold = True
    r.font.color.rgb = RGBColor(30, 41, 59) # Slate 800
    return p

def add_bullet(doc, text, bold_prefix="", level=0):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    if level > 0:
        p.paragraph_format.left_indent = Inches(0.25 * level)
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.bold = True
        r_pre.font.name = 'Cordia New'
        r_pre.font.size = Pt(13)
        r_pre.font.color.rgb = RGBColor(30, 41, 59)
    r = p.add_run(text)
    r.font.name = 'Cordia New'
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(51, 51, 51)
    return p

def main():
    doc = docx.Document()
    
    # Page Setup (A4, 1-inch margins)
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
    # --- DOCUMENT HEADER / COVER BANNER ---
    header_table = doc.add_table(rows=1, cols=1)
    header_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = header_table.cell(0, 0)
    c.width = Inches(6.67)
    set_cell_shading(c, "007A3B") # K-Helps dark green
    set_cell_margins(c, top=240, bottom=240, left=260, right=260)
    
    p_title = c.paragraphs[0]
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(4)
    r1 = p_title.add_run("คู่มือและสูตรการคำนวณ K-Helps Analytics Center\n")
    r1.bold = True
    r1.font.name = 'Cordia New'
    r1.font.size = Pt(22)
    r1.font.color.rgb = RGBColor(255, 255, 255)
    
    p_sub = c.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(0)
    r2 = p_sub.add_run("SLA & Performance Metrics Calculation Manual (System Documentation v2.0)\nธนาคารกสิกรไทย (KBank) • ฝ่ายสนับสนุนงานไอที K-Helps")
    r2.font.name = 'Cordia New'
    r2.font.size = Pt(13)
    r2.font.color.rgb = RGBColor(220, 245, 230)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    
    # Intro
    p_intro = doc.add_paragraph()
    style_paragraph(p_intro, font_size=13.5, space_after=8)
    r_intro = p_intro.add_run("เอกสารฉบับนี้จัดทำขึ้นเพื่ออธิบายรายละเอียดแหล่งที่มาของข้อมูล เกณฑ์การคัดกรอง (Filters) เงื่อนไขการคำนวณ (Business Logic) ตลอดจนสูตรคณิตศาสตร์ที่ใช้ประมวลผลตัวชี้วัดในแต่ละแท็บ (Module) ของระบบ ")
    p_intro.add_run("K-Helps Analytics Center").bold = True
    p_intro.add_run(" ไว้อย่างครบถ้วน สำหรับเจ้าหน้าที่ ผู้ดูแลระบบ และผู้บริหารใช้เป็นมาตรฐานในการตรวจสอบ")

    # Table of Contents Box
    toc_tbl = doc.add_table(rows=6, cols=2)
    toc_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(toc_tbl, color="E2E8F0")
    
    modules_toc = [
        ("Module 1", "First Response ECE By Agents (Chat SLA) - วัดเวลาตอบแชทแรก"),
        ("Module 2", "% Within SLA of 16 Apps (Task SLA) - ปิดเคส ServiceNow ตาม Priority"),
        ("Module 3", "Call Not Received (Within 12 Secs) - ติดตามเวลารับสายโทรศัพท์ CUIC"),
        ("Module 4", "Call Back (ABN Call of Ex) - รายการสายหลุด Khelps_Expert เทียบ CUIC"),
        ("Module 5", "%FCR (Target > 90%) - First Contact Resolution ตามช่องทางและ Agent"),
    ]
    
    # Header TOC
    c0 = toc_tbl.cell(0, 0)
    c1 = toc_tbl.cell(0, 1)
    set_cell_shading(c0, "F1F5F9")
    set_cell_shading(c1, "F1F5F9")
    set_cell_margins(c0, top=100, bottom=100, left=140, right=140)
    set_cell_margins(c1, top=100, bottom=100, left=140, right=140)
    p = c0.paragraphs[0]; p.add_run("โมดูล (Module)").bold = True; p.runs[0].font.name='Cordia New'; p.runs[0].font.size=Pt(13)
    p = c1.paragraphs[0]; p.add_run("รายละเอียดตัวชี้วัดและวัตถุประสงค์").bold = True; p.runs[0].font.name='Cordia New'; p.runs[0].font.size=Pt(13)
    
    for idx, (m_code, m_desc) in enumerate(modules_toc, start=1):
        cell_a = toc_tbl.cell(idx, 0)
        cell_b = toc_tbl.cell(idx, 1)
        cell_a.width = Inches(1.8)
        cell_b.width = Inches(4.8)
        set_cell_margins(cell_a, top=60, bottom=60, left=140, right=140)
        set_cell_margins(cell_b, top=60, bottom=60, left=140, right=140)
        if idx % 2 == 1:
            set_cell_shading(cell_a, "FAFAFA")
            set_cell_shading(cell_b, "FAFAFA")
        pa = cell_a.paragraphs[0]; r = pa.add_run(m_code); r.bold = True; r.font.name='Cordia New'; r.font.size=Pt(12.5); r.font.color.rgb = RGBColor(0, 122, 59)
        pb = cell_b.paragraphs[0]; r = pb.add_run(m_desc); r.font.name='Cordia New'; r.font.size=Pt(12.5)
        
    doc.add_paragraph().paragraph_format.space_after = Pt(12)
    
    # ==============================================================
    # MODULE 1
    # ==============================================================
    add_header_1(doc, "1. Module 1: First Response ECE By Agents (Chat SLA)")
    
    add_header_2(doc, "1.1 วัตถุประสงค์ (Objective)")
    p = doc.add_paragraph()
    style_paragraph(p, font_size=13)
    p.add_run("ใช้สำหรับวัดประสิทธิภาพความรวดเร็วในการตอบรับแชทครั้งแรก (")
    p.add_run("First Response Time").bold = True
    p.add_run(") ของเจ้าหน้าที่ K-Helps เมื่อมีผู้ติดต่อผ่านช่องทาง LINE / ECE Chat โดยดูว่าสามารถเข้ามารับแชทและพิมพ์ตอบข้อความแรกได้ทันตามเกณฑ์ที่กำหนดหรือไม่")
    
    add_header_2(doc, "1.2 แหล่งที่มาของข้อมูล (Data Source)")
    add_bullet(doc, "รายงานประวัติการสนทนาของระบบแชท LINE K-Helps", "ไฟล์นำเข้า: ")
    add_bullet(doc, "session_id, date, time, source, agent_skill, message_text, agent_name", "คอลัมน์สำคัญ: ")
    
    add_header_2(doc, "1.3 ขั้นตอนและเงื่อนไขการคำนวณ (Workflow & Business Logic)")
    add_bullet(doc, "ระบบค้นหาข้อความจาก Bot (source = 'bot') ที่มีทักษะ IT (agent_skill = 'IT') และมีข้อความต้อนรับอัตโนมัติ: \"กรุณารอสักครู่ เจ้าหน้าที่ (K-Helps) จะมาดูแลนะคะ\" เพื่อตั้งเป็นเวลาเริ่มต้น (waitStart)", "1) จุดเริ่มนับเวลา (Start Timer): ")
    add_bullet(doc, "ระบบตรวจหาข้อความแรกจาก Agent ในทีม K-Helps (Valid Team Agents) ที่ส่งเข้าสู่เซสชัน เพื่อตั้งเป็นเวลาสิ้นสุด (agentTime)", "2) จุดหยุดเวลา (Stop Timer): ")
    add_bullet(doc, "คำนวณเวลาระหว่าง waitStart และ agentTime ภายใต้เงื่อนไขเวลาทำการ 08:30 น. - 20:00 น. เท่านั้น หากมีการรอค้างข้ามคืน ช่วงเวลา 20:00 - 08:30 น. จะถูกหักออก (Pause) ไม่นับเป็นเวลารอของลูกค้า", "3) เวลาทำการ (Business Operating Hours): ")
    add_bullet(doc, "หาก Response Time ≤ 8 นาที จัดเป็น \"Within SLA (ผ่าน)\" หากเกิน 8 นาที จัดเป็น \"Breach SLA (หลุดเกณฑ์)\"", "4) เกณฑ์การตัดสิน (Breach Criterion): ")
    
    add_formula_box(doc, 
                    "% Within SLA = (จำนวนเคสแชทที่ตอบทันภายใน 8 นาที ÷ จำนวนเคสแชททั้งหมด) × 100", 
                    "หมายเหตุ: คิดเฉพาะเซสชันที่มีข้อความเริ่มรอของ Bot และมี Agent รับงานตามรายชื่อที่ถูกต้อง")
    
    # ==============================================================
    # MODULE 2
    # ==============================================================
    add_header_1(doc, "2. Module 2: % Within SLA of 16 Apps (Task SLA)")
    
    add_header_2(doc, "2.1 วัตถุประสงค์ (Objective)")
    p = doc.add_paragraph()
    style_paragraph(p, font_size=13)
    p.add_run("ติดตามความรวดเร็วในการจัดการและแก้ไขงาน (Tasks) ของ 16 แอปพลิเคชันสำคัญในระบบ ServiceNow ของธนาคาร โดยเทียบกับข้อตกลงระดับการบริการตามระดับความสำคัญ (Priority)")
    
    add_header_2(doc, "2.2 แหล่งที่มาของข้อมูล (Data Source)")
    add_bullet(doc, "ไฟล์ Excel Export จากระบบ ServiceNow รายงาน SLA", "ไฟล์นำเข้า: ")
    add_bullet(doc, "Task, Priority, Additional Services, Assigned to, Application Acronym, Business elapsed percentage, Business elapsed time", "คอลัมน์สำคัญ: ")
    
    add_header_2(doc, "2.3 กฎการคัดกรองข้อมูล (Data Cleaning Rules)")
    add_callout(doc, [
        "1. Deduplication (ตัดเคสซ้ำ): ข้อมูลในคอลัมน์ 'Task' หากมีเลขซ้ำกัน ให้คัดกรองเหลือเพียงเลขเดียวเท่านั้น",
        "2. Blank Additional Services: คอลัมน์ 'Additional Services' ต้องเป็นค่าว่าง (Blank) เท่านั้น หากมีข้อความหรือสถานะอื่นให้ตัดออก",
        "3. Exclude Business User: คอลัมน์ 'Assigned to' ให้ตัดผู้รับผิดชอบที่เป็น 'KBANK - Business User KBANK - Business User' ออก"
    ], title="3 กฎเหล็กในการคัดกรองข้อมูล Task SLA", bg_color="FFFBEB", border_color="F59E0B")
    
    add_header_2(doc, "2.4 เกณฑ์เวลา SLA Target ตาม Priority")
    p_tbl = doc.add_table(rows=5, cols=4)
    p_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(p_tbl, color="CBD5E1")
    
    headers_p = ["Priority", "ระดับความรุนแรง", "SLA Target (ชั่วโมง)", "SLA Target (วินาที)"]
    for i, h in enumerate(headers_p):
        cell = p_tbl.cell(0, i)
        set_cell_shading(cell, "007A3B")
        set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
        p = cell.paragraphs[0]; r = p.add_run(h); r.bold = True; r.font.name='Cordia New'; r.font.size=Pt(13); r.font.color.rgb = RGBColor(255, 255, 255)
        
    p_rows = [
        ("Priority 1", "Critical (วิกฤต)", "2 ชั่วโมง", "7,200 วินาที"),
        ("Priority 2", "High (สูง)", "4 ชั่วโมง", "14,400 วินาที"),
        ("Priority 3", "Moderate (ปานกลาง)", "8 ชั่วโมง", "28,800 วินาที"),
        ("Priority 4", "Low (ต่ำ)", "8 ชั่วโมง", "28,800 วินาที"),
    ]
    for r_idx, (c0, c1, c2, c3) in enumerate(p_rows, start=1):
        for col_idx, val in enumerate([c0, c1, c2, c3]):
            cell = p_tbl.cell(r_idx, col_idx)
            set_cell_margins(cell, top=60, bottom=60, left=120, right=120)
            if r_idx % 2 == 1: set_cell_shading(cell, "F8FAFC")
            p = cell.paragraphs[0]; r = p.add_run(val); r.font.name='Cordia New'; r.font.size=Pt(12.5)
            if col_idx == 0: r.bold = True
            if col_idx in [2, 3]: p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    
    add_header_2(doc, "2.5 เกณฑ์การตัดสินและสูตรคำนวณ")
    add_bullet(doc, "Business elapsed percentage > 100% หรือ Business elapsed time > SLA Target", "เคสหลุด SLA (Breach): ")
    add_bullet(doc, "Business elapsed percentage ≤ 100% และ Business elapsed time ≤ SLA Target", "เคสผ่าน SLA (Within): ")
    
    add_formula_box(doc, 
                    "% Within SLA (16 Apps) = (จำนวน Task ที่ไม่หลุด SLA ÷ จำนวน Task ทั้งหมดหลังกรอง) × 100", 
                    "แยกวิเคราะห์เป็นรายแอปพลิเคชัน (16 Apps) และภาพรวมความสำเร็จของระบบ")
    
    # ==============================================================
    # MODULE 3
    # ==============================================================
    add_header_1(doc, "3. Module 3: Call Not Received (Within 12 Secs) (CUIC Report)")
    
    add_header_2(doc, "3.1 วัตถุประสงค์ (Objective)")
    p = doc.add_paragraph()
    style_paragraph(p, font_size=13)
    p.add_run("ติดตามและวิเคราะห์ความรวดเร็วในการกดรับสายโทรศัพท์ของเจ้าหน้าที่ผ่านระบบ Cisco Contact Center (CUIC) เพื่อควบคุมไม่ให้ปล่อยให้สายดัง (Ring Time) เกินเกณฑ์มาตรฐาน ")
    p.add_run("12 วินาที").bold = True
    
    add_header_2(doc, "3.2 แหล่งที่มาของข้อมูล (Data Source)")
    add_bullet(doc, "ไฟล์รายงาน Cisco CUIC: Detailed Call CSQ Agent Report.xlsx", "ไฟล์นำเข้า: ")
    add_bullet(doc, "Node ID - Session ID - Sequence No, Call Start Time, Call End Time, Ring Time, Queue Time, Agent Name, CSQ Names", "คอลัมน์สำคัญ: ")
    
    add_header_2(doc, "3.3 เกณฑ์และสูตรการคำนวณ")
    add_bullet(doc, "คัดกรองเฉพาะแถวที่มี Session ID ขึ้นต้นด้วย \"1-\" เพื่อตัดบรรทัดหัวตารางและยอดรวมสรุปออก", "1) การคัดกรองเรคคอร์ด: ")
    add_bullet(doc, "แปลงค่าเวลาในคอลัมน์ Ring Time (HH:mm:ss) ให้เป็นวินาทีรวม (ringSec)", "2) การแปลงค่าเวลา: ")
    add_bullet(doc, "หาก Ring Time < 12 วินาที ถือเป็นระดับปกติ (Normal) / หาก Ring Time ≥ 12 วินาที จัดเป็นเคสเตือนสีแดง (Alert 12s)", "3) การประเมินเกณฑ์ 12 วินาที: ")
    
    add_formula_box(doc, 
                    "% Alert 12s = (จำนวนสายที่ดัง ≥ 12 วินาที ÷ จำนวนสายทั้งหมด) × 100\n"
                    "Avg Ring Time = ผลรวมเวลาก่อนรับสายทั้งหมด (วินาที) ÷ จำนวนสายทั้งหมด", 
                    "วัดประสิทธิภาพการสแตนด์บายรับสายของทีมและแยกเป็นรายบุคคล")
    
    # ==============================================================
    # MODULE 4
    # ==============================================================
    add_header_1(doc, "4. Module 4: Call Back (ABN Call of Ex) (Abandoned Calls vs CUIC)")
    
    add_header_2(doc, "4.1 วัตถุประสงค์ (Objective)")
    p = doc.add_paragraph()
    style_paragraph(p, font_size=13)
    p.add_run("ตรวจสอบสายที่ไม่ได้รับ (สายหลุด / วางสายก่อน - Abandoned Calls) เฉพาะกลุ่มทักษะงาน ")
    p.add_run("Khelps_Expert").bold = True
    p.add_run(" เพื่อใช้เป็นรายชื่อติดต่อกลับ (Call Back) และตรวจสอบสาเหตุว่าสายหลุดตั้งแต่ในคิว หรือหลุดตอนที่เครื่องของ Agent กำลังดัง")
    
    add_header_2(doc, "4.2 แหล่งที่มาของข้อมูล (Data Source)")
    add_bullet(doc, "Abandoned Call Detail Activity Report.xlsx (รายงานสายที่ไม่ได้รับ)", "ไฟล์หลัก: ")
    add_bullet(doc, "Detailed Call CSQ Agent Report.xlsx (รายงานโทรศัพท์จากระบบ CUIC)", "ไฟล์อ้างอิงร่วม: ")
    
    add_header_2(doc, "4.3 อัลกอริทึมการจับคู่ข้ามไฟล์ (Cross-file Matching Logic)")
    add_bullet(doc, "ตรงกันสมบูรณ์ด้วย Call Start Time และ Call ANI (เบอร์ลูกค้า)", "ขั้นที่ 1 (Exact Match): ")
    add_bullet(doc, "ตรงกันด้วย Call End Time เท่ากับ Call Abandon Time และตรงกับ Call ANI", "ขั้นที่ 2 (End-to-Abandon Match): ")
    add_bullet(doc, "ตรงกันด้วย Call Start Time และชื่อ Agent Name", "ขั้นที่ 3 (Start-Agent Match): ")
    add_bullet(doc, "วันเดียวกัน เบอร์โทรเดียวกัน และเวลาเริ่มโทรคลาดเคลื่อนไม่เกิน ±15 วินาที", "ขั้นที่ 4 (Near-Time Window): ")
    
    add_header_2(doc, "4.4 ความหมายของค่าในคอลัมน์ 'CUIC Ring Time (≤ 12s)' และเหตุผลที่ขึ้น 0:00:00")
    ab_tbl = doc.add_table(rows=4, cols=3)
    ab_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(ab_tbl, color="CBD5E1")
    
    h_ab = ["ค่าที่แสดงผล", "สถานะสายในระบบ", "ความหมายและสาเหตุ"]
    for i, h in enumerate(h_ab):
        cell = ab_tbl.cell(0, i)
        set_cell_shading(cell, "007A3B")
        set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
        p = cell.paragraphs[0]; r = p.add_run(h); r.bold = True; r.font.name='Cordia New'; r.font.size=Pt(13); r.font.color.rgb = RGBColor(255, 255, 255)
        
    rows_ab = [
        ("0:00:00", "Queue Abandon\n(หลุดในคิว)", "ลูกค้าตัดสายขณะรอในคิว (Waiting in Queue) สายยังไม่ทันถูกส่งไปดังที่เครื่อง Agent คนใดเลย จึงมี Ring Time = 0 วินาที อย่างถูกต้อง"),
        ("🟠 0:00:01 - 0:00:11", "Ring Abandon\n(หลุดตอนเครื่องดัง)", "ระบบส่งสายไปดังที่เครื่อง Agent แล้ว แต่ลูกค้ารอไม่ไหวจึงวางสายไปก่อน (ยังอยู่ในเกณฑ์ไม่เกิน 12 วินาที)"),
        ("🔴 ≥ 0:00:12", "Alert Over SLA\n(ดังเกินเกณฑ์)", "สายถูกส่งไปดังที่เครื่อง Agent นานเกินกว่า 12 วินาที แล้วไม่มีผู้รับสายจนกระทั่งสายหลุดไป"),
    ]
    for r_idx, (c0, c1, c2) in enumerate(rows_ab, start=1):
        for col_idx, val in enumerate([c0, c1, c2]):
            cell = ab_tbl.cell(r_idx, col_idx)
            set_cell_margins(cell, top=60, bottom=60, left=120, right=120)
            if r_idx % 2 == 1: set_cell_shading(cell, "F8FAFC")
            p = cell.paragraphs[0]; r = p.add_run(val); r.font.name='Cordia New'; r.font.size=Pt(12.5)
            if col_idx == 0: r.bold = True
            
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    
    # ==============================================================
    # MODULE 5
    # ==============================================================
    add_header_1(doc, "5. Module 5: %FCR (Target > 90%) (First Contact Resolution)")
    
    add_header_2(doc, "5.1 วัตถุประสงค์ (Objective)")
    p = doc.add_paragraph()
    style_paragraph(p, font_size=13)
    p.add_run("วัดอัตราความสำเร็จในการแก้ไขปัญหาให้ลูกค้าจบได้ตั้งแต่การติดต่อครั้งแรก (")
    p.add_run("First Contact Resolution").bold = True
    p.add_run(") โดยกำหนดเป้าหมายมาตรฐานขององค์กรไว้ที่ ")
    p.add_run("มากกว่า 90% (Target > 90%)").bold = True
    
    add_header_2(doc, "5.2 แหล่งที่มาของข้อมูล (Data Source)")
    add_bullet(doc, "ไฟล์ ServiceNow Incident Report (Incident.xlsx)", "ไฟล์นำเข้า: ")
    add_bullet(doc, "Number, Channel, Service, Category, State, Opened, Opened by, Assignee", "คอลัมน์สำคัญ: ")
    
    add_header_2(doc, "5.3 กฎการคัดกรองตัวหารและตัวตั้ง (FCR Business Logic)")
    
    fcr_rule_tbl = doc.add_table(rows=3, cols=3)
    fcr_rule_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(fcr_rule_tbl, color="CBD5E1")
    
    h_fcr = ["ส่วนประกอบ", "ชื่อตารางในระบบ", "เงื่อนไขการคัดเลือก (Criteria)"]
    for i, h in enumerate(h_fcr):
        cell = fcr_rule_tbl.cell(0, i)
        set_cell_shading(cell, "007A3B")
        set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
        p = cell.paragraphs[0]; r = p.add_run(h); r.bold = True; r.font.name='Cordia New'; r.font.size=Pt(13); r.font.color.rgb = RGBColor(255, 255, 255)
        
    rows_fcr = [
        ("ตัวหาร\n(Denominator)", "Total Handled Contacts", "1. ตัด Service: tracking, software support, hardware support ออกทั้งหมด\n2. เลือก Category: เฉพาะ Email, Inquiry/Help และ Software เท่านั้น"),
        ("ตัวตั้ง\n(Numerator)", "FCR Resolved Contacts", "1. ต้องผ่านเงื่อนไขของตัวหารทั้งหมด\n2. Service: ต้องเลือกเฉพาะที่มีคำว่า 'RFI' (Request for Information) เท่านั้น\n3. State: ต้องมีสถานะเป็น 'Resolved' หรือ 'Closed' เท่านั้น"),
    ]
    for r_idx, (c0, c1, c2) in enumerate(rows_fcr, start=1):
        for col_idx, val in enumerate([c0, c1, c2]):
            cell = fcr_rule_tbl.cell(r_idx, col_idx)
            set_cell_margins(cell, top=70, bottom=70, left=120, right=120)
            if r_idx % 2 == 1: set_cell_shading(cell, "F8FAFC")
            p = cell.paragraphs[0]; r = p.add_run(val); r.font.name='Cordia New'; r.font.size=Pt(12.5)
            if col_idx < 2: r.bold = True
            
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    
    add_header_2(doc, "5.4 สูตรคำนวณ %FCR และเกณฑ์การประเมิน")
    add_formula_box(doc, 
                    "%FCR = (FCR Resolved Contacts (ตัวตั้ง) ÷ Total Handled Contacts (ตัวหาร)) × 100", 
                    "เกณฑ์การประเมิน: หากได้ ≥ 90% จะได้รับสถานะ PASS (สีเขียว) / หากต่ำกว่า 90% จะได้รับสถานะ BELOW (สีแดง)")
    
    add_header_2(doc, "5.5 การจัดกลุ่มช่องทาง (Channel Groups)")
    add_bullet(doc, "Channel = 'Phone'", "Voice (Phone): ")
    add_bullet(doc, "Channel = 'LINE'", "Non Voice (LINE): ")
    add_bullet(doc, "Channel = Email, MS Team, MS Team_Athena, Self-service เป็นต้น", "Email + Other: ")
    
    add_header_2(doc, "5.6 การวิเคราะห์รายบุคคล (By Agent View - Opened by)")
    add_bullet(doc, "อ้างอิงจากคอลัมน์ 'Opened by' เป็นหลัก (หากว่างจะดึงจาก Assignee)", "ผู้เปิดเคส (Agent Name): ")
    add_bullet(doc, "สามารถเลือกดูเฉพาะเจ้าหน้าที่ในทีม K-Helps (Team Agents) หรือเจ้าหน้าที่ทั้งหมด (All) ได้", "ตัวกรอง Scope: ")
    add_bullet(doc, "หัวตารางรองรับการคลิกจัดเรียง (Interactive Sorting) ทั้งเคสทั้งหมด (Base), เคส FCR, Non-FCR, %FCR และสัดส่วนช่องทางได้ทันที", "คุณสมบัติตาราง: ")
    
    # Save document
    out_path = r"d:\โปรเจ็คทั้งหมด\Auu\K_HELPS_ANALYTICS_MANUAL.docx"
    doc.save(out_path)
    print(f"Successfully generated: {out_path}")

if __name__ == '__main__':
    main()
