import Foundation
import Capacitor
import PassKit

@objc(ApplePayPlugin)
public class ApplePayPlugin: CAPPlugin, PKPaymentAuthorizationViewControllerDelegate {

    // MARK: - Properties
    private var currentCall: CAPPluginCall?
    private var paymentController: PKPaymentAuthorizationViewController?

    // MARK: - Plugin Methods

    /// Verifica se o dispositivo suporta Apple Pay
    @objc func canMakePayments(_ call: CAPPluginCall) {
        let canMakePayments = PKPaymentAuthorizationViewController.canMakePayments()

        // Verifica se tem cartoes configurados (opcional)
        let networks: [PKPaymentNetwork] = [.visa, .masterCard, .amex, .elo]
        let canMakePaymentsWithNetworks = PKPaymentAuthorizationViewController.canMakePayments(usingNetworks: networks)

        call.resolve([
            "canMakePayments": canMakePayments,
            "canMakePaymentsWithNetworks": canMakePaymentsWithNetworks,
            "hasSetupCards": canMakePaymentsWithNetworks
        ])
    }

    /// Inicia o pagamento com Apple Pay
    @objc func requestPayment(_ call: CAPPluginCall) {
        // Validar parametros obrigatorios
        guard let merchantId = call.getString("merchantId") else {
            call.reject("merchantId is required")
            return
        }

        guard let amount = call.getDouble("amount") else {
            call.reject("amount is required")
            return
        }

        guard let currencyCode = call.getString("currencyCode") else {
            call.reject("currencyCode is required")
            return
        }

        guard let countryCode = call.getString("countryCode") else {
            call.reject("countryCode is required")
            return
        }

        let label = call.getString("label") ?? "Total"
        let itemsArray = call.getArray("items", JSObject.self) ?? []

        // Verificar suporte
        guard PKPaymentAuthorizationViewController.canMakePayments() else {
            call.reject("Apple Pay is not available on this device", "APPLE_PAY_NOT_AVAILABLE")
            return
        }

        // Configurar a requisicao de pagamento
        let paymentRequest = PKPaymentRequest()
        paymentRequest.merchantIdentifier = merchantId
        paymentRequest.countryCode = countryCode
        paymentRequest.currencyCode = currencyCode
        paymentRequest.supportedNetworks = [.visa, .masterCard, .amex, .elo, .discover]
        paymentRequest.merchantCapabilities = [.capability3DS, .capabilityDebit, .capabilityCredit]

        // Criar itens de pagamento
        var paymentItems: [PKPaymentSummaryItem] = []

        // Adicionar itens individuais se fornecidos
        for item in itemsArray {
            if let itemLabel = item["label"] as? String,
               let itemAmount = item["amount"] as? Double {
                let summaryItem = PKPaymentSummaryItem(
                    label: itemLabel,
                    amount: NSDecimalNumber(value: itemAmount)
                )
                paymentItems.append(summaryItem)
            }
        }

        // Adicionar o total (obrigatorio - ultimo item)
        let totalItem = PKPaymentSummaryItem(
            label: label,
            amount: NSDecimalNumber(value: amount)
        )
        paymentItems.append(totalItem)

        paymentRequest.paymentSummaryItems = paymentItems

        // Solicitar informacoes adicionais se necessario
        if call.getBool("requireBillingAddress") ?? false {
            paymentRequest.requiredBillingContactFields = [.postalAddress, .name]
        }

        if call.getBool("requireShippingAddress") ?? false {
            paymentRequest.requiredShippingContactFields = [.postalAddress, .name, .phoneNumber, .emailAddress]
        }

        // Criar o controller de autorizacao
        guard let paymentController = PKPaymentAuthorizationViewController(paymentRequest: paymentRequest) else {
            call.reject("Unable to create payment authorization controller", "CONTROLLER_ERROR")
            return
        }

        paymentController.delegate = self
        self.paymentController = paymentController
        self.currentCall = call

        // Apresentar o modal do Apple Pay na thread principal
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            if let viewController = self.bridge?.viewController {
                viewController.present(paymentController, animated: true, completion: nil)
            } else {
                call.reject("Unable to present payment controller", "PRESENTATION_ERROR")
            }
        }
    }

    /// Abre as configuracoes do Wallet para adicionar cartoes
    @objc func openWalletSetup(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: "shoebox://") {
                if UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url, options: [:], completionHandler: { success in
                        call.resolve(["opened": success])
                    })
                } else {
                    // Fallback para configuracoes
                    if let settingsUrl = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(settingsUrl, options: [:], completionHandler: { success in
                            call.resolve(["opened": success, "openedSettings": true])
                        })
                    } else {
                        call.reject("Unable to open Wallet settings")
                    }
                }
            } else {
                call.reject("Unable to open Wallet")
            }
        }
    }

    // MARK: - PKPaymentAuthorizationViewControllerDelegate

    /// Chamado quando o usuario autoriza o pagamento (duplo clique no botao lateral)
    public func paymentAuthorizationViewController(
        _ controller: PKPaymentAuthorizationViewController,
        didAuthorizePayment payment: PKPayment,
        handler completion: @escaping (PKPaymentAuthorizationResult) -> Void
    ) {
        // Extrair o token de pagamento
        let paymentData = payment.token.paymentData
        let paymentDataString = paymentData.base64EncodedString()

        // Extrair informacoes do metodo de pagamento
        let paymentMethod = payment.token.paymentMethod

        // Informacoes de contato de cobranca (se solicitado)
        var billingInfo: [String: Any] = [:]
        if let billingContact = payment.billingContact {
            billingInfo = extractContactInfo(from: billingContact)
        }

        // Informacoes de contato de envio (se solicitado)
        var shippingInfo: [String: Any] = [:]
        if let shippingContact = payment.shippingContact {
            shippingInfo = extractContactInfo(from: shippingContact)
        }

        // IMPORTANTE: Aqui voce deve enviar o paymentData para seu backend
        // para processar com seu gateway de pagamento (Stripe, Adyen, etc.)
        // O backend deve retornar se o pagamento foi aprovado ou nao

        // Por enquanto, vamos assumir sucesso e retornar os dados para o JS
        // O processamento real deve ser feito no backend

        let result: [String: Any] = [
            "success": true,
            "paymentData": paymentDataString,
            "transactionIdentifier": payment.token.transactionIdentifier,
            "paymentMethod": [
                "displayName": paymentMethod.displayName ?? "",
                "network": paymentMethod.network?.rawValue ?? "",
                "type": paymentMethodTypeString(paymentMethod.type)
            ],
            "billingContact": billingInfo,
            "shippingContact": shippingInfo
        ]

        // Informar sucesso ao Apple Pay
        completion(PKPaymentAuthorizationResult(status: .success, errors: nil))

        // Resolver a call do Capacitor
        currentCall?.resolve(result)
    }

    /// Chamado quando o modal do Apple Pay e fechado
    public func paymentAuthorizationViewControllerDidFinish(_ controller: PKPaymentAuthorizationViewController) {
        DispatchQueue.main.async { [weak self] in
            controller.dismiss(animated: true) { [weak self] in
                // Se a call ainda nao foi resolvida, significa que o usuario cancelou
                if let call = self?.currentCall {
                    call.resolve([
                        "success": false,
                        "cancelled": true,
                        "error": "Payment was cancelled by user"
                    ])
                }

                self?.currentCall = nil
                self?.paymentController = nil
            }
        }
    }

    // MARK: - Helper Methods

    /// Extrai informacoes de contato do PKContact
    private func extractContactInfo(from contact: PKContact) -> [String: Any] {
        var info: [String: Any] = [:]

        if let name = contact.name {
            info["givenName"] = name.givenName ?? ""
            info["familyName"] = name.familyName ?? ""
            info["fullName"] = "\(name.givenName ?? "") \(name.familyName ?? "")".trimmingCharacters(in: .whitespaces)
        }

        if let emailAddress = contact.emailAddress {
            info["email"] = emailAddress
        }

        if let phoneNumber = contact.phoneNumber {
            info["phone"] = phoneNumber.stringValue
        }

        if let postalAddress = contact.postalAddress {
            info["address"] = [
                "street": postalAddress.street,
                "city": postalAddress.city,
                "state": postalAddress.state,
                "postalCode": postalAddress.postalCode,
                "country": postalAddress.country,
                "isoCountryCode": postalAddress.isoCountryCode
            ]
        }

        return info
    }

    /// Converte o tipo de metodo de pagamento para string
    private func paymentMethodTypeString(_ type: PKPaymentMethodType) -> String {
        switch type {
        case .debit:
            return "debit"
        case .credit:
            return "credit"
        case .prepaid:
            return "prepaid"
        case .store:
            return "store"
        case .eMoney:
            return "eMoney"
        default:
            return "unknown"
        }
    }
}
