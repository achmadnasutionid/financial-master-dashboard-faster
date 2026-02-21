// PPh (Pajak Penghasilan) options in Indonesia (labels normalized to remove any leading/trailing whitespace)
const PPH_OPTIONS_RAW: readonly { value: string; label: string }[] = [
  { value: "0", label: "0% - No PPh" },
  { value: "0.5", label: "0.5% - PPh Pasal 23 - After reporting the tax please send us the withholding tax slip" },
  { value: "2", label: "2% - PPh Pasal 23 - After reporting the tax please send us the withholding tax slip" },
  { value: "2.5", label: "2.5% - PPh Pasal 21" },
]
export const PPH_OPTIONS = PPH_OPTIONS_RAW.map((o) => ({
  value: o.value,
  label: o.label.replace(/^\s+|\s+$/g, ""),
}))

