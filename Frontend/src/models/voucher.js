export default class Voucher{
    //Costruttore
    constructor(codice, dataScadenza, stato){
        this.codice = codice;
        this.dataScadenza = dataScadenza;
        this.stato = stato;
    }
    //Metodi dell'Applciazione
    usa(){} //Da implementare
    verificaValidita(){} //Da implementare

    //Metodi JSON
    toJSON(){
        return{
            __type: 'Voucher',
            codice: this.codice,
            dataScadenza: this.dataScadenza,
            stato: this.stato
        }
    }
    fromJSON(obj){
        return new Voucher(obj.codice, obj.dataScadenza, obj.stato);
    }
}