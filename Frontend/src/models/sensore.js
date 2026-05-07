export default class Sensore{
    //Costruttore
    constructor(idSensore, capacitaResidua, livelloBatteria, ultimoAggiornamento){
        this.idSensore = idSensore;
        this.capacitaResidua = capacitaResidua;
        this.livelloBatteria = livelloBatteria;
        this.ultimoAggiornamento = ultimoAggiornamento;
    }

    //Metodi dell'Applicazione
    rilevaRiempimento(){} //Da implementare
    inviaDati(){} //Da implementare

    //Metodi JSON
    toJSON(){
        return{
            __type: 'Sensore',
            idSensore: this.idSensore,
            capacitaResidura: this.capacitaResidua,
            livelloBatteria: this.livelloBatteria,
            ultimoAggiornamento: this.ultimoAggiornamento
        }
    }
    fromJSON(obj){
        return new Sensore(obj.idSensore, obj.capacitaResidua, obj.livelloBatteria, obj.ultimoAggiornamento);
    }
}