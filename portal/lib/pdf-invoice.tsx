import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Invoice, InvoiceLine, Org } from "@/db/schema";
import { date, money } from "@/lib/format";

const s = StyleSheet.create({
  page: { padding: 56, fontSize: 10, color: "#07080A", fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 36,
    borderBottomWidth: 0.5,
    borderBottomColor: "#3F4157",
    paddingBottom: 18,
  },
  brand: { fontSize: 12, fontFamily: "Helvetica-Bold", letterSpacing: 1.2 },
  brandDot: { width: 6, height: 6, backgroundColor: "#E7FF00", marginBottom: 6 },
  meta: { fontSize: 9, color: "#6F7287", textAlign: "right" },
  metaLabel: { fontSize: 7, color: "#9E9F9B", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 2 },
  number: { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#07080A", marginBottom: 6 },
  parties: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  party: { width: "48%" },
  partyTitle: { fontSize: 7, color: "#9E9F9B", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6 },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  partyLine: { fontSize: 9, color: "#3F4157", marginBottom: 2 },
  table: { borderTopWidth: 0.5, borderTopColor: "#3F4157" },
  row: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: "#E2E3DE" },
  rowHeader: { borderBottomColor: "#3F4157" },
  c1: { width: "12%", fontSize: 7, letterSpacing: 1.2, textTransform: "uppercase", color: "#6F7287" },
  c2: { width: "48%" },
  c3: { width: "12%", textAlign: "right" },
  c4: { width: "14%", textAlign: "right" },
  c5: { width: "14%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  totals: { flexDirection: "row", justifyContent: "flex-end", marginTop: 18 },
  totalsBox: { width: "40%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#3F4157",
    marginTop: 6,
  },
  grandLabel: { fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 56,
    right: 56,
    fontSize: 8,
    color: "#9E9F9B",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export function InvoicePdf({
  invoice,
  lines,
  org,
}: {
  invoice: Invoice;
  lines: InvoiceLine[];
  org: Org;
}) {
  const total = lines.reduce((acc, l) => acc + l.amountMinor, 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <View style={s.brandDot} />
            <Text style={s.brand}>NAVON</Text>
            <Text style={s.metaLabel}>Customer portal</Text>
          </View>
          <View style={s.meta}>
            <Text style={s.metaLabel}>Invoice</Text>
            <Text style={s.number}>{invoice.number}</Text>
            <Text style={s.metaLabel}>Issued</Text>
            <Text>{date(invoice.issuedAt)}</Text>
            <Text style={[s.metaLabel, { marginTop: 6 }]}>Due</Text>
            <Text>{date(invoice.dueAt)}</Text>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.partyTitle}>From</Text>
            <Text style={s.partyName}>Navon World Ltd</Text>
            <Text style={s.partyLine}>Hells Gate Deep Tech Park</Text>
            <Text style={s.partyLine}>Naivasha, Kenya</Text>
            <Text style={s.partyLine}>info@navonworld.com</Text>
          </View>
          <View style={s.party}>
            <Text style={s.partyTitle}>Billed to</Text>
            <Text style={s.partyName}>{org.name}</Text>
            <Text style={s.partyLine}>
              Period {date(invoice.periodStart)} – {date(invoice.periodEnd)}
            </Text>
          </View>
        </View>

        <View style={s.table}>
          <View style={[s.row, s.rowHeader]}>
            <Text style={s.c1}>Category</Text>
            <Text style={[s.c2, s.c1]}>Description</Text>
            <Text style={[s.c3, s.c1]}>Qty</Text>
            <Text style={[s.c4, s.c1]}>Unit</Text>
            <Text style={[s.c5, s.c1]}>Amount</Text>
          </View>
          {lines.map((l) => (
            <View key={l.id} style={s.row}>
              <Text style={[s.c1, { color: "#07080A", fontFamily: "Helvetica-Bold" }]}>
                {l.category}
              </Text>
              <Text style={s.c2}>{l.description}</Text>
              <Text style={s.c3}>
                {l.quantity.toLocaleString("en-KE", { maximumFractionDigits: 2 })}
              </Text>
              <Text style={s.c4}>{money(l.unitPriceMinor, invoice.currency)}</Text>
              <Text style={s.c5}>{money(l.amountMinor, invoice.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totals}>
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text>Subtotal</Text>
              <Text>{money(total, invoice.currency)}</Text>
            </View>
            <View style={s.totalGrand}>
              <Text style={s.grandLabel}>Total due</Text>
              <Text style={s.grandLabel}>{money(total, invoice.currency)}</Text>
            </View>
          </View>
        </View>

        <View style={s.footer}>
          <Text>Pay by bank transfer or M-Pesa Paybill 000000 (acct: {invoice.number}).</Text>
          <Text>navonworld.com</Text>
        </View>
      </Page>
    </Document>
  );
}
