import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { API_URL } from '../../src/config';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker'; //picker per l'assegnazione dell'operatore
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminReportsScreen() {
    const [reports, setReports] = useState([]);
    const [operators, setOperators] = useState([]); // Stato per salvare gli operatori disponibili
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('registered_user');
    const router = useRouter();

    const fetchData = async () => {
        setLoading(true);
        try {
            // Recupero tutte le segnalazioni
            const reportsRes = await axios.get(`${API_URL}/report/all`);
            setReports(reportsRes.data.reports || reportsRes.data || []);
            console.log("Segnalazioni recuperate:", reportsRes.data.reports || reportsRes.data || []);
            
            // Recupero token per autenticazione -> SOLO ADMIN PUO' VEDERE GLI OPERATORI DISPONIBILI PER ASSEGNARLI ALLE SEGNALAZIONI APPROVATE
            const token = await AsyncStorage.getItem('token');

            const usersRes = await axios.get(`${API_URL}/user/all`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurazione standard per authMiddleware
                }
            });

            const allUsers = usersRes.data.users || usersRes.data || [];
            const onlyOperators = allUsers.filter(u => u.role === 'operator');
            console.log("Operatori recuperati:", onlyOperators);
            setOperators(onlyOperators);

        } catch (err) {
            console.error("Errore nel recupero dei dati:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (reportId, action) => {
        try {
            const nextStatus = action === 'ACCEPT' ? 'ACCEPT' : 'REJECTED';
            const response = await axios.put(`${API_URL}/report/update/${reportId}`, {
                status: nextStatus
            });

            if (response.status === 200 || response.data.success) {
                setReports(prevReports =>
                    prevReports.map(r => r._id === reportId ? { ...r, status: nextStatus } : r) // Aggiorna lo stato locale per riflettere l'azione avvenuta
                );
                alert(`Segnalazione ${action === 'ACCEPT' ? 'accettata' : 'rifiutata'} con successo.`);
            } else {
                alert("Impossibile aggiornare lo stato della segnalazione.");
            }
        } catch (err) {
            console.error(`Errore durante l'azione ${action}:`, err);
            alert("Errore di connessione con il server.");
        }
    };

    // Funzione per assegnare l'operatore alla segnalazione
    const handleAssignOperator = async (reportId, operatorId) => {
        if (!operatorId) return;
        try {
            // Invio della richiesta di assegnazione al backend
            const response = await axios.put(`${API_URL}/report/assign/${reportId}`, {
                assignedTo: operatorId 
            });

            if (response.status === 200 || response.data.success) {
                setReports(prevReports =>
                    prevReports.map(r => r._id === reportId ? { ...r, assignedTo: operatorId } : r)
                );
                alert("Operatore assegnato con successo alla segnalazione!");
            } else {
                alert("Impossibile assegnare l'operatore.");
            }
        } catch (err) {
            console.error("Errore durante l'assegnazione dell'operatore:", err);
            alert("Errore di connessione durante l'assegnazione.");
        }
    };

    // Logica di filtraggio per le Tab
    const filteredReports = reports.filter(report => {
        if (activeTab === 'segnalazioni_approvate') {
            return report.status === 'ACCEPT';
        }
        // Nelle prime due tab mostriamo solo quelle pendenti (non ancora accettate o rifiutate)
        const isPending = report.status !== 'ACCEPT' && report.status !== 'REJECTED';
        const userRole = report.userId?.role || 'registered_user';
        return isPending && userRole === activeTab;
    });

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#d32f2f" />
            </View>
        );
    }

    return (
        <View style={styles.mainWrapper}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>

                <TouchableOpacity style={styles.backButtonInline} onPress={() => router.replace('/')}>
                    <Text style={styles.backButtonInlineText}>⬅ Torna alla Mappa</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Pannello Amministratore</Text>
                <Text style={styles.subtitle}>Gestione e approvazione segnalazioni guasti</Text>

                {/* ── TAB DI SEPARAZIONE ── */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'registered_user' && styles.activeTabButton]}
                        onPress={() => setActiveTab('registered_user')}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'registered_user' && styles.activeTabButtonText]}>
                            👤 Report Cittadini ({reports.filter(r => r.status !== 'ACCEPT' && r.status !== 'REJECTED' && (r.userId?.role || 'registered_user') === 'registered_user').length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'operator' && styles.activeTabButton]}
                        onPress={() => setActiveTab('operator')}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'operator' && styles.activeTabButtonText]}>
                            🛠️ Report Operatori ({reports.filter(r => r.status !== 'ACCEPT' && r.status !== 'REJECTED' && r.userId?.role === 'operator').length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'segnalazioni_approvate' && styles.activeTabButton]}
                        onPress={() => setActiveTab('segnalazioni_approvate')}
                    >
                        <Text style={[styles.tabButtonText, activeTab === 'segnalazioni_approvate' && styles.activeTabButtonText]}>
                            ✅ Approvate ({reports.filter(r => r.status === 'ACCEPT').length})
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                {/* ── GRIGLIA REATTIVA DELLE CARD ── */}
                {filteredReports.length > 0 ? (
                    <View style={styles.gridContainer}>
                        {filteredReports.map((report) => (
                            <View key={report._id} style={[
                                styles.reportCard,
                                activeTab === 'segnalazioni_approvate'
                                    ? styles.approvedCardBorder
                                    : (report.userId?.role === 'operator' ? styles.operatorCardBorder : styles.userCardBorder)
                            ]}>

                                <View style={styles.cardHeader}>
                                    <Text style={styles.binCodeText}>
                                        {report.binType?.toUpperCase() || 'RIFIUTO'} ({report.binName || 'N/D'})
                                    </Text>
                                    <Text style={styles.userRoleBadge}>
                                        {report.userId?.role === 'operator' ? '👷 Operatore' : '📱 Cittadino'}
                                    </Text>
                                </View>

                                <Text style={styles.reporterName}>Inviata da: {report.userId?.name || 'Utente Sconosciuto'}</Text>
                                <Text style={styles.centerNameText}>📍 Centro: {report.binCenter || 'Centro non disponibile'}</Text>

                                <View style={styles.descriptionBox}>
                                    <Text style={styles.descriptionText}>"{report.description}"</Text>
                                </View>

                                {/* ── LOGICA DINAMICA DELLE AZIONI IN BASE ALLA TAB ── */}
                                {activeTab === 'segnalazioni_approvate' ? (
                                    // Vista per la Tab Approvate: Assegnazione Operatore
                                    <View style={styles.assignmentBox}>
                                        <Text style={styles.assignmentLabel}>👷 Assegna a un Operatore:</Text>
                                        <View style={styles.pickerWrapper}>
                                            <Picker
                                                selectedValue={report.assignedTo || report.assignedOperator?._id || ''}
                                                style={styles.pickerStyle}
                                                onValueChange={(itemValue) => handleAssignOperator(report._id, itemValue)}
                                            >
                                                <Picker.Item label="Seleziona Operatore..." value="" />
                                                {operators.map(op => (
                                                    <Picker.Item key={op._id} label={op.name} value={op._id} />
                                                ))}
                                            </Picker>
                                        </View>
                                        {(report.assignedTo || report.assignedOperator) && (
                                            <Text style={styles.assignedStatus}>Status: Scansione presa in carico</Text>
                                        )}
                                    </View>
                                ) : (
                                    <View style={styles.actionsRow}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.rejectButton]}
                                            onPress={() => handleAction(report._id, 'REJECT')}
                                        >
                                            <Text style={styles.rejectButtonText}>❌ Rifiuta</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.acceptButton]}
                                            onPress={() => handleAction(report._id, 'ACCEPT')}
                                        >
                                            <Text style={styles.acceptButtonText}>✅ Approva</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.noReportsText}>Nessuna segnalazione da gestire in questa categoria.</Text>
                )}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainWrapper: {
        flex: 1,
        backgroundColor: '#fff'
    },
    container: {
        flex: 1,
        width: '100%'
    },
    content: {
        padding: 32,
        paddingTop: 40,
        width: '100%'
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    backButtonInline: {
        marginBottom: 20
    },
    backButtonInlineText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600'
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#111'
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        marginTop: 4
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 25
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#eee',
        borderRadius: 8,
        padding: 4,
        marginTop: 15,
        maxWidth: 800
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 6
    },
    activeTabButton: {
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1
        },
        shadowOpacity: 0.15
    },
    tabButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666'
    },
    activeTabButtonText: {
        color: '#111',
        fontWeight: 'bold'
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginHorizontal: -10
    },
    reportCard: {
        backgroundColor: '#fafafa',
        borderRadius: 12,
        padding: 18,
        margin: 10,
        width: '31%',
        minWidth: 320,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
    },
    centerNameText: {
        fontSize: 13,
        color: '#555',
        fontWeight: '500',
        marginBottom: 12
    },
    userCardBorder: {
        borderLeftWidth: 5,
        borderLeftColor: '#009933'
    },
    operatorCardBorder: {
        borderLeftWidth: 5,
        borderLeftColor: '#2196f3'
    },
    approvedCardBorder: {
        borderLeftWidth: 5,
        borderLeftColor: '#ef6c00'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    binCodeText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
    },
    userRoleBadge: {
        fontSize: 12,
        fontWeight: '600',
        color: '#777',
        backgroundColor: '#e8e8e8',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4
    },
    reporterName: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12
    },
    descriptionBox: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        minHeight: 60
    },
    descriptionText: {
        fontSize: 14,
        color: '#444',
        fontStyle: 'italic'
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto'
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4
    },
    rejectButton: {
        backgroundColor: '#ffebee',
        borderWidth: 1,
        borderColor: '#ffc107'
    },
    rejectButtonText: {
        color: '#c62828',
        fontWeight: '700',
        fontSize: 14
    },
    acceptButton: {
        backgroundColor: '#d4edda',
        borderWidth: 1,
        borderColor: '#c3e6cb'
    },
    acceptButtonText: {
        color: '#155724',
        fontWeight: '700',
        fontSize: 14
    },
    noReportsText: {
        fontStyle: 'italic',
        color: '#999',
        textAlign: 'center',
        marginTop: 40,
        width: '100%'
    },
    assignmentBox: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 12
    },
    assignmentLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#444',
        marginBottom: 6
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        backgroundColor: '#fff',
        overflow: 'hidden'
    },
    pickerStyle: {
        height: 40,
        width: '100%'
    },
    assignedStatus: {
        fontSize: 12,
        color: '#ef6c00',
        marginTop: 6,
        fontWeight: '600',
        fontStyle: 'italic'
    }
});