/** PayMate expects amounts with 2 decimal places (e.g. "4.00", not "4"). */
function formatPaymateAmount(amount) {
  return Number(amount).toFixed(2);
}

/** Invoice date in YYYY-MM-DD as used by live merchants. */
function getPaymateInvoiceDate() {
  return new Date().toISOString().slice(0, 10);
}

/** Empty-string fields present in working live merchant requests (must be sent, not omitted). */
const PAYMATE_BLANK_FIELDS = {
  ContactXpressID: '',
  InvoiceTerm: '',
  GSTType: '',
  GST: '',
};

const PAYMATE_INTENT_DEFAULTS = {
  targetApp: 'GPAY',
  deviceOS: 'ANDROID',
};

/**
 * Build CollectPayments payload per PayMate UPI Intent / checkout API.
 * @param {object} options
 */
function buildCollectPaymentsPayload(options) {
  const {
    orderId,
    referenceCode = '',
    companyName = 'Fomino Product Hub Pvt Ltd',
    mobile = '9876543210',
    email = 'debug@fominomart.in',
    invoiceAmount = 100,
    paymentMode = 'UPI',
    paymentType = 'Intent',
    targetApp = PAYMATE_INTENT_DEFAULTS.targetApp,
    deviceOS = PAYMATE_INTENT_DEFAULTS.deviceOS,
    includeIntentFields = paymentType === 'Intent',
    blankOverrides = {},
    returnUrl,
    remarks = 'Payments',
  } = options;

  const transactionDetails = {
    OrderID: orderId,
    CompanyName: companyName,
    ReferenceCode: blankOverrides.ReferenceCode ?? referenceCode,
    ContactXpressID: blankOverrides.ContactXpressID ?? PAYMATE_BLANK_FIELDS.ContactXpressID,
    ReceipentMobileNo: mobile,
    RecipentEmailAddress: email,
    UDF1: [],
    UDF2: [],
    UDF3: [],
    Remarks: remarks,
  };
  if (returnUrl) {
    transactionDetails.ReturnURL = returnUrl;
  }

  const paymentMethod = {
    PaymentMode: paymentMode,
    PaymentType: paymentType,
  };
  if (paymentMode === 'UPI' && includeIntentFields) {
    paymentMethod.TargetApp = targetApp;
    paymentMethod.DeviceOS = deviceOS;
  }

  return {
    CollectionDetails: [
      {
        TransactionDetails: transactionDetails,
        INVOICE: {
          InvoiceNumber: `INV${orderId}`,
          InvoiceStartDate: getPaymateInvoiceDate(),
          InvoiceTerm: blankOverrides.InvoiceTerm ?? PAYMATE_BLANK_FIELDS.InvoiceTerm,
          InvoiceAmount: formatPaymateAmount(invoiceAmount),
          GSTType: blankOverrides.GSTType ?? PAYMATE_BLANK_FIELDS.GSTType,
          GST: blankOverrides.GST ?? PAYMATE_BLANK_FIELDS.GST,
        },
        PaymentMethod: paymentMethod,
        SplitMDR: {
          BuyerCharges: '0',
          SupplierCharges: '100',
        },
      },
    ],
  };
}

module.exports = {
  formatPaymateAmount,
  getPaymateInvoiceDate,
  PAYMATE_BLANK_FIELDS,
  PAYMATE_INTENT_DEFAULTS,
  buildCollectPaymentsPayload,
};

function buildPaymateOrderId(style = 'long') {
  if (style === 'short') {
    return `UPIOITest${String(Date.now()).slice(-3)}`;
  }
  const now = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const dd = pad(now.getDate());
  const mm = pad(now.getMonth() + 1);
  const yy = String(now.getFullYear()).slice(-2);
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const rnd = pad(Math.floor(Math.random() * 1000000000), 9);
  return `FOM${dd}${mm}${yy}${hh}${min}${ss}${rnd}`.slice(0, 24);
}

/** PayMate support Antara UPI Intent v2 sample (field-for-field). */
function buildPaymateAntaraV2SamplePayload(orderId = `Ordupi${Date.now()}`) {
  return {
    CollectionDetails: [
      {
        TransactionDetails: {
          OrderID: orderId,
          CompanyName: 'Antara',
          ReferenceCode: '',
          ReceipentMobileNo: '',
          RecipentEmailAddress: '',
          ContactXpressID: '',
          UDF1: [],
          UDF2: [],
          UDF3: [],
          Remarks: 'Test for collection',
        },
        INVOICE: {
          InvoiceNumber: '',
          InvoiceStartDate: '',
          InvoiceTerm: '',
          InvoiceAmount: '201',
          GSTType: '',
          GST: '',
        },
        PaymentMethod: {
          PaymentMode: 'UPI',
          PaymentType: 'Intent',
          DeviceOS: 'ANDROID',
          TargetApp: 'GPAY',
        },
        SplitMDR: {
          BuyerCharges: '0',
          SupplierCharges: '100',
        },
      },
    ],
  };
}

module.exports.buildPaymateOrderId = buildPaymateOrderId;
module.exports.buildPaymateAntaraV2SamplePayload = buildPaymateAntaraV2SamplePayload;
