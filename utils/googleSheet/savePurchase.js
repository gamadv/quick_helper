function alertMessage(title, message) {
    SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function savePurchase() {
    if (!SpreadsheetApp.getActiveSheet().getRange("D27").getValue())
        return alertMessage("⚠️ Atenção, campo de preço vazio.", "Por favor, preencha com preço");

    // Obtenha os valores das células de entrada
    var nome = SpreadsheetApp.getActiveSheet().getRange("B27").getValue();
    var tipo = SpreadsheetApp.getActiveSheet().getRange("C27").getValue();
    var preco = SpreadsheetApp.getActiveSheet().getRange("D27").getValue();

    // Defina a guia de destino (altere "Base de Dados" para o nome da sua guia)
    var cardSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Card");

    // Obtenha a última linha preenchida na guia de destino
    var ultimaLinha = cardSheet.getLastRow() + 1;

    // Armazene os dados na guia de cardSheet
    cardSheet.getRange(ultimaLinha, 1).setValue(nome);
    cardSheet.getRange(ultimaLinha, 2).setValue(tipo);
    cardSheet.getRange(ultimaLinha, 3).setValue(preco);

    // Limpe os campos de entrada
    SpreadsheetApp.getActiveSheet().getRange("B27").setValue("");
    SpreadsheetApp.getActiveSheet().getRange("C27").setValue("");
    SpreadsheetApp.getActiveSheet().getRange("D27").setValue("");
}
