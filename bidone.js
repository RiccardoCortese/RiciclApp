export default class Bidone{
    //Costruttore
    constructor(idBidone, tipoRifiuto, livelloRiempimento, stato){
        this.idBidone = idBidone;
        this.tipoRifiuto = tipoRifiuto;
        this.livelloRiempimento = livelloRiempimento;
        this.stato = stato;
    }
    //Metodi per l'Applicazione
    aggiornaRiempimento(){} //Da implementare

    cambiaStato(){} //Da implementare

    svuota(){} //Da implementare

    //Metodi JSON
    toJSON(){
        return{
            __type: 'Bidone',
            idBidone: this.idBidone,
            tipoRifiuto: this.tipoRifiuto,
            livelloRiempimento: this.livelloRiempimento,
            stato: this.stato
        }
    }
    formJSON(obj){
        return new Bidone(obj.idBidone, obj.tipoRifiuto, obj.livelloRiempimento, obj.stato);
    }
}