const { paymateV1CollectEndpoint } = require('./paymate-config');
const {
  buildCollectPaymentsPayload,
  buildPaymateOrderId,
  buildPaymateAntaraV2SamplePayload,
} = require('./paymate-payload');

/**
 * Run exhaustive CollectPayments combination tests (Treviqo-style).
 * @param {ReturnType<typeof import('./paymate-config').getPaymateConfig>} config
 * @param {Record<string, string>} baseHeaders
 * @param {(config, headers, payload, endpoint?) => Promise<object>} postPaymateVariant
 */
async function runCombinationTests(config, baseHeaders, postPaymateVariant) {
  const v1Endpoint = paymateV1CollectEndpoint(config.endpoint);
  const v2Endpoint = config.endpointV2 || config.endpoint;
  const siteReturn = (orderId) =>
    `${config.siteUrl}/paymate-return.html?orderId=${encodeURIComponent(orderId)}`;

  const specs = [
    {
      id: 'paymate_antara_v2_exact',
      hypothesis: 'PayMate Antara sample: blank mobile/email/invoice, amount 201, v2 Intent',
      doc_ref: 'PayMate support Antara UPI Intent sample',
      endpoint: v2Endpoint,
      rawPayload: buildPaymateAntaraV2SamplePayload(),
    },
    {
      id: 'antara_v2_fomino01',
      hypothesis: 'Antara empty-field style + ReferenceCode FOMINO01 on v2',
      endpoint: v2Endpoint,
      buildPayload: () => {
        const p = buildPaymateAntaraV2SamplePayload(buildPaymateOrderId('long'));
        p.CollectionDetails[0].TransactionDetails.ReferenceCode = 'FOMINO01';
        return p;
      },
    },
    {
      id: 'baseline_intent_v2_fomino01',
      hypothesis: 'Production shape: v2 + FOMINO01 + UPI Intent + ANDROID + 100.00',
      options: {
        referenceCode: 'FOMINO01',
        invoiceAmount: 100,
      },
    },
    {
      id: 'baseline_blank_ref_v2',
      hypothesis: 'Blank ReferenceCode + UPI Intent on v2',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: '',
        invoiceAmount: 100,
      },
    },
    {
      id: 'checkout_upi_vpa_v2',
      hypothesis: 'Checkout doc: v2 + UPI + VPA, no DeviceOS/TargetApp',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: '',
        paymentType: 'VPA',
        includeIntentFields: false,
        invoiceAmount: 100,
      },
    },
    {
      id: 'checkout_upi_qrcode_v2',
      hypothesis: 'Checkout doc: v2 + UPI + QRCode',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: '',
        paymentType: 'QRCode',
        includeIntentFields: false,
        invoiceAmount: 100,
      },
    },
    {
      id: 'checkout_upi_vpa_slash_qrcode_v2',
      hypothesis: 'Checkout doc: v2 + UPI + VPA/QRCode',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: '',
        paymentType: 'VPA/QRCode',
        includeIntentFields: false,
        invoiceAmount: 100,
      },
    },
    {
      id: 'checkout_credit_card_v2',
      hypothesis: 'Checkout doc: v2 + CreditCard + Card',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: '',
        paymentMode: 'CreditCard',
        paymentType: 'Card',
        invoiceAmount: 100,
      },
    },
    {
      id: 'intent_v1_blank_ref',
      hypothesis: 'UPI Intent doc: v1 + blank ReferenceCode',
      endpoint: v1Endpoint,
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: '',
        invoiceAmount: 100,
      },
    },
    {
      id: 'intent_v1_fomino01',
      hypothesis: 'UPI Intent doc: v1 + ReferenceCode FOMINO01',
      endpoint: v1Endpoint,
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: 'FOMINO01',
        invoiceAmount: 100,
      },
    },
    {
      id: 'intent_v1_env_ref',
      hypothesis: 'UPI Intent: v1 + PAYMATE_REFERENCE_CODE from env',
      endpoint: v1Endpoint,
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: config.referenceCode,
        invoiceAmount: 100,
      },
    },
    {
      id: 'checkout_upi_vpa_v1_fomino01',
      hypothesis: 'Checkout on v1: UPI + VPA + FOMINO01',
      endpoint: v1Endpoint,
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: 'FOMINO01',
        paymentType: 'VPA',
        includeIntentFields: false,
        invoiceAmount: 100,
      },
    },
    {
      id: 'working_clone_4_00',
      hypothesis: 'Working merchant clone: blank ref, 4.00, Rakesh Kumar',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: '',
        companyName: 'Rakesh Kumar',
        email: 'user9898989898@gmail.com',
        invoiceAmount: 4,
      },
    },
    {
      id: 'working_clone_short_order',
      hypothesis: 'Working merchant: short OrderID UPIOITest###',
      options: {
        orderId: buildPaymateOrderId('short'),
        referenceCode: '',
        companyName: 'Rakesh Kumar',
        email: 'user9898989898@gmail.com',
        invoiceAmount: 4,
      },
    },
    {
      id: 'ref_fomino01_v2',
      hypothesis: 'ReferenceCode FOMINO01 on v2 Intent',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: 'FOMINO01',
        invoiceAmount: 100,
      },
    },
    {
      id: 'device_ios',
      hypothesis: 'DeviceOS IOS instead of ANDROID',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: 'FOMINO01',
        invoiceAmount: 100,
        deviceOS: 'IOS',
      },
    },
    {
      id: 'target_phonepe',
      hypothesis: 'TargetApp PHONEPE instead of GPAY',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: 'FOMINO01',
        invoiceAmount: 100,
        targetApp: 'PHONEPE',
      },
    },
    {
      id: 'invoice_term_space',
      hypothesis: 'InvoiceTerm = single space (PayMate blank hint)',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: 'FOMINO01',
        blankOverrides: { InvoiceTerm: ' ' },
      },
    },
    {
      id: 'intent_no_return_url',
      hypothesis: 'UPI Intent without ReturnURL',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: 'FOMINO01',
        invoiceAmount: 100,
        returnUrl: undefined,
      },
    },
    {
      id: 'remarks_payments',
      hypothesis: 'Remarks = Payments (production value)',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: 'FOMINO01',
        invoiceAmount: 100,
        remarks: 'Payments',
      },
    },
    {
      id: 'debit_card',
      hypothesis: 'DebitCard — terminal accepts cards but not UPI?',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: 'FOMINO01',
        paymentMode: 'DebitCard',
        paymentType: 'Card',
        invoiceAmount: 100,
      },
    },
    {
      id: 'netbanking',
      hypothesis: 'NetBanking — terminal accepts banking but not UPI?',
      options: {
        orderId: buildPaymateOrderId('long'),
        referenceCode: 'FOMINO01',
        paymentMode: 'NetBanking',
        paymentType: 'Banking',
        invoiceAmount: 100,
      },
    },
  ];

  const results = [];
  for (const spec of specs) {
    try {
      let payload;
      if (spec.buildPayload) {
        payload = spec.buildPayload();
      } else if (spec.rawPayload) {
        payload = spec.rawPayload;
      } else {
        const opts = { ...spec.options, orderId: spec.options?.orderId || buildPaymateOrderId('long') };
        if (spec.id !== 'intent_no_return_url') {
          opts.returnUrl = siteReturn(opts.orderId);
        }
        payload = buildCollectPaymentsPayload(opts);
      }
      const collection = payload.CollectionDetails[0];
      const tx = collection.TransactionDetails;
      const inv = collection.INVOICE;
      const pm = collection.PaymentMethod;
      const result = await postPaymateVariant(
        config,
        baseHeaders,
        payload,
        spec.endpoint
      );
      results.push({
        id: spec.id,
        hypothesis: spec.hypothesis,
        doc_ref: spec.doc_ref,
        endpoint: result.endpoint || spec.endpoint || config.endpoint,
        reference_code: tx.ReferenceCode,
        payment_mode: pm.PaymentMode,
        payment_type: pm.PaymentType,
        invoice_amount: inv.InvoiceAmount,
        ...result,
      });
    } catch (err) {
      results.push({
        id: spec.id,
        hypothesis: spec.hypothesis,
        error: err.message,
      });
    }
  }
  return results;
}

function analyzeRootCauses(combinationResults, primaryStatus) {
  const causes = [];
  const all178 = combinationResults.every((r) => r.status_code === '178' || r.error);
  const upiResults = combinationResults.filter((r) => r.payment_mode === 'UPI');
  const nonUpiResults = combinationResults.filter((r) => r.payment_mode && r.payment_mode !== 'UPI');
  const nonUpiSuccess = nonUpiResults.some((r) => r.success);
  const upiAnySuccess = upiResults.some((r) => r.success);
  const anySuccess = combinationResults.some((r) => r.success);

  if (primaryStatus === '105') {
    causes.push('CONFIRMED: IP whitelist or invalid source (105) — not a JSON format issue.');
  } else if (all178 && !anySuccess) {
    causes.push(
      'REQUEST SHAPE RULED OUT: All ' +
        combinationResults.length +
        ' combination tests returned 178/211. PayMate decrypts requests (OrderID echoed) — failure is terminal/merchant config, not payload format.'
    );
    causes.push(
      'PayMate must enable payment modes on Terminal B24D5B35-E880-4C94-AD96-22ED2972E795 / KIJY000002.'
    );
  } else if (anySuccess) {
    causes.push('CONFIRMED: Request shape matters — at least one combination succeeded. See combination_winner.');
  }

  if (nonUpiSuccess && !upiAnySuccess) {
    causes.push('CONFIRMED: Terminal accepts card/netbanking but NOT UPI — enable UPI Intent on PayMate side.');
  } else if (!nonUpiSuccess && all178) {
    causes.push(
      'LIKELY: No payment mode enabled on terminal (UPI, DebitCard, NetBanking, CreditCard all 178).'
    );
  }

  const blankRef = combinationResults.find((r) => r.id === 'baseline_blank_ref_v2');
  const fominoRef = combinationResults.find((r) => r.id === 'ref_fomino01_v2');
  if (blankRef && fominoRef && blankRef.status_code === fominoRef.status_code) {
    causes.push('REJECTED: ReferenceCode blank vs FOMINO01 on v2 — same status code.');
  } else if (blankRef?.success || fominoRef?.success) {
    causes.push('CONFIRMED: ReferenceCode value matters on v2.');
  }

  const v1Blank = combinationResults.find((r) => r.id === 'intent_v1_blank_ref');
  const v1Fomino = combinationResults.find((r) => r.id === 'intent_v1_fomino01');
  if (v1Blank && v1Fomino) {
    if (v1Blank.status_code === '531' || String(v1Blank.description || '').includes('ReferenceCode')) {
      causes.push('CONFIRMED: v1 rejects blank ReferenceCode — use FOMINO01.');
    }
    if (v1Fomino?.success) {
      causes.push('CONFIRMED: v1 + FOMINO01 works — set PAYMATE_API_VERSION=v1 on Hostinger.');
    }
  }

  const uniqueCodes = [...new Set(combinationResults.map((r) => r.status_code).filter(Boolean))];
  causes.push(`Status codes seen across combinations: ${uniqueCodes.join(', ') || 'none'}`);

  return causes;
}

module.exports = { runCombinationTests, analyzeRootCauses };
