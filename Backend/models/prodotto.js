export default class Prodotto{
    //Costruttore
    constructor(idProdotto, nome, codiceBarcode, categoria){
        this.idProdotto = idProdotto;
        this.nome = nome;
        this.codiceBarcode = codiceBarcode;
        this.categoria = categoria;
    }
    //Metodi dell'Applicazione
    ottieniRegolaSmaltimento(){} //Da implementare

    //Metodi JSON
    toJSON(){
        return{
            __type: 'Prodotto',
            idProdotto = this.idProdotto,
            nome = this.nome,
            codiceBarcode = this.codiceBarcode,
            categoria = this.categoria
        }
    }
    fromJSON(obj){
        return new Prodotto(obj.idProdotto, obj.nome, obj.codiceBarcode, obj.categoria);
    }

}