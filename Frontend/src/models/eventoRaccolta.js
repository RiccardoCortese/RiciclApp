export default class EventoRaccolta{
    //Costruttore
    constructor(idEvento, nome, descrizione, dataInizio, dataFine, area, puntiTotali, partecipanti){
        this.idEvento = idEvento;
        this.nome = nome;
        this.descrizione = descrizione;
        this.dataInizio = dataInizio;
        this.dataFine = dataFine;
        this.area = area;
        this.puntiTotali = puntiTotali;
        this.partecipanti = partecipanti;
    }
    //Metodi dell'Applicazione
    partecipa(){} //Da implementare
    terminaEvento(){} //Da implementare

    //Metodi JSON
    toJSON(){
        return{
            __type: 'EventoRaccolta',
            idEvento: this.idEvento,
            nome : this.nome,
            descrizione: this.descrizione,
            dataInizio: this.dataInizio,
            dataFine: this.dataFine,
            area: this.area,
            puntiTotali: this.puntiTotali,
            partecipanti: this.partecipanti
        }
    }

    fromJSON(obj){
        return new EventoRaccolta(obj.idEvento, obj.nome, obj.descrizione, obj.dataInizio, obj.dataFine, obj.area, obj.puntiTotali, obj.partecipanti);
    }
}