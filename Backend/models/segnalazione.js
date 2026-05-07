export default class Segnalazione{
    //Costruttore
    constructor(idSegnalazione, descrizione, foto, posizione, dataInvio, stato, tipo){
        this.idSegnalazione = idSegnalazione;
        this.descrizione = descrizione;
        this.foto = foto;
        this.posizione = posizione;
        this.dataInvio = dataInvio;
        this.stato = stato;
        this.tipo = tipo;
    }
    //Metodi dell'Applicazione
    invia(){} //Da implementare

    //Metodi JSON
    toJSON(){
        return{
            __type: 'Segnalazione',
            idSegnalazione: this.idSegnalazione,
            descrizione: this.descrizione,
            foto: this.foto,
            posizione: this.posizione,
            dataInvio: this.dataInvio,
            stato: this.stato,
            tipo: this.tipo
        }
    }
    formJSON(obj){
        return new Segnalazione(obj.idSegnalazione, obj.descrizione, obj.formJSON, obj.posizione, obj.dataInvio, obj.stato, obj.tipo);
    }

}