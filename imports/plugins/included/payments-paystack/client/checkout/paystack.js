/* eslint camelcase: 0 */
import { Meteor } from "meteor/meteor";
import { Template } from "meteor/templating";
import { Reaction } from "/client/api";
import { Cart, Shops, Packages } from "/lib/collections";
import "../../lib/api/paystackApi";
import "./paystack.html";
import { PaystackPayment } from "../../lib/collections/schemas";


let submitting = false;

function uiEnd(template, buttonText) {
  template.$(":input").removeAttr("disabled");
  template.$("#btn-complete-order").text(buttonText);
  return template.$("#btn-processing").addClass("hidden");
}

function paymentAlert(errorMessage) {
  return $(".alert").removeClass("hidden").text(errorMessage);
}

function hidePaymentAlert() {
  return $(".alert").addClass("hidden").text("");
}

function handleExampleSubmitError(error) {
  const serverError = error !== null ? error.message : void 0;
  if (serverError) {
    return paymentAlert("Oops! " + serverError);
  } else if (error) {
    return paymentAlert("Oops! " + error, null, 4);
  }
}


Template.paystackPaymentForm.helpers({
  PaystackPayment() {
    return PaystackPayment;
  }
});

AutoForm.addHooks("example-payment-form", {
  onSubmit: function (doc) {
    submitting = true;
    const template = this.template;
    hidePaymentAlert();
    const form = {
      name: doc.payerName,
      number: doc.cardNumber,
      expireMonth: doc.expireMonth,
      expireYear: doc.expireYear,
      cvv2: doc.cvv,
      type: Reaction.getCardType(doc.cardNumber)
    };
    const storedCard = form.type.charAt(0).toUpperCase() + form.type.slice(1) + " " + doc.cardNumber.slice(-4);
    Meteor.subscribe("Packages");
    const packageData = Packages.findOne({
      name: "example-paymentmethod",
      shopId: Reaction.getShopId()
    });
    Example.authorize(form, {
      total: Cart.findOne().cartTotal(),
      currency: Shops.findOne().currency
    }, function (error, transaction) {
      submitting = false;
      let paymentMethod;
      if (error) {
        handleExampleSubmitError(error);
        uiEnd(template, "Resubmit payment");
      } else {
        if (transaction.saved === true) {
          submitting = false;
          paymentMethod = {
            processor: "Paystack",
            paymentPackageId: packageData._id,
            paymentSettingsKey: packageData.registry[0].settingsKey,
            storedCard: storedCard,
            method: "credit",
            transactionId: transaction.transactionId,
            currency: transaction.currency,
            amount: transaction.amount,
            status: transaction.status,
            mode: "authorize",
            createdAt: new Date(),
            transactions: []
          };
          Alerts.toast("Transaction successful");
          paymentMethod.transactions.push(transaction.response);
          Meteor.call("cart/submitPayment", paymentMethod);
        } else {
          handleExampleSubmitError(transaction.error);
          uiEnd(template, "Resubmit payment");
        }
      }
    });
    return false;
  },
  beginSubmit: function () {
    this.template.$(":input").attr("disabled", true);
    this.template.$("#btn-complete-order").text("Submitting ");
    return this.template.$("#btn-processing").removeClass("hidden");
  },
  endSubmit: function () {
    if (!submitting) {
      return uiEnd(this.template, "Complete your order");
    }
  }
});
