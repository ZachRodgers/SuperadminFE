import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Import useParams
import './TransactionLog.css';
import billingData from '../data/BillingCalculator.json';

interface BillingEntry {
    lotID: string;
    plate: string;
    timestampIn: string;
    timestampOut: string;
    amountOwed: string;
    settingsLink: string;
    status: string;
}

interface SortConfig {
    key: keyof BillingEntry | 'duration';
    direction: 'ascending' | 'descending';
}

const BillingCalculator: React.FC = () => {
    const { lotId } = useParams<{ lotId: string }>(); // Get the lotID from the route
    const [filteredBilling, setFilteredBilling] = useState<BillingEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({
        key: 'timestampIn', // Default sorting by Date
        direction: 'ascending',
    });

    useEffect(() => {
        fetchBillingData();
    }, [lotId]); // Trigger data fetch whenever lotId changes

    const fetchBillingData = () => {
        // Filter entries by matching lotID with the current lotId from the route
        const filteredData = billingData.filter(entry => entry.lotID === lotId);
        setFilteredBilling(filteredData);
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value.toLowerCase());
    };

    const calculateDuration = (inTime: string, outTime: string): string => {
        const start = new Date(inTime);
        const end = new Date(outTime);
        const durationMs = end.getTime() - start.getTime();
        
        const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return `${days} days ${hours} hrs`;
        } else if (hours > 0) {
            return `${hours} hrs ${minutes} mins`;
        } else {
            return `${minutes} mins`;
        }
    };

    const filteredResults = filteredBilling
        .filter((entry) => {
            const normalizedData = `${entry.plate} ${entry.timestampIn} ${entry.timestampOut} ${entry.status}`.toLowerCase();
            return normalizedData.includes(searchQuery);
        })
        .sort((a, b) => {
            if (sortConfig.key) {
                let aVal: string | number = '';
                let bVal: string | number = '';

                if (sortConfig.key === 'duration') {
                    aVal = new Date(a.timestampOut).getTime() - new Date(a.timestampIn).getTime();
                    bVal = new Date(b.timestampOut).getTime() - new Date(b.timestampIn).getTime();
                } else if (sortConfig.key === 'amountOwed') {
                    aVal = parseFloat(a.amountOwed);
                    bVal = parseFloat(b.amountOwed);
                } else {
                    aVal = a[sortConfig.key];
                    bVal = b[sortConfig.key];
                }

                if (sortConfig.direction === 'ascending') {
                    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                } else {
                    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                }
            }
            return 0;
        });

    const handleSort = (key: keyof BillingEntry | 'duration') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const renderArrow = (key: keyof BillingEntry | 'duration') => {
        const isActive = sortConfig.key === key;
        const direction = isActive && sortConfig.direction === 'descending' ? 'descending' : 'ascending';
        return (
            <img
                src={`/assets/FilterArrow${isActive ? 'Selected' : ''}.svg`}
                alt="Sort Arrow"
                className={`sort-arrow ${direction}`}
            />
        );
    };

    return (
        <div className="billing-calculator">
            <h1>Transaction Log</h1>
            <div className="search-and-view">
                <div className="search-bar">
                    <img src="/assets/SearchBarIcon.svg" alt="Search" />
                    <input
                        type="text"
                        placeholder="Search Plate, Date, Duration, Amount or Status"
                        value={searchQuery}
                        onChange={handleSearch}
                    />
                </div>
                <button className="view-settings-button" onClick={() => alert('View Saved Settings clicked!')}>
                    View Saved Settings
                </button>
            </div>
            <table className="billing-calculator-table">
                <thead>
                    <tr>
                        <th onClick={() => handleSort('plate')} className="sortable-column">
                            Plate
                            {renderArrow('plate')}
                        </th>
                        <th onClick={() => handleSort('timestampIn')} className="sortable-column">
                            Date
                            {renderArrow('timestampIn')}
                        </th>
                        <th onClick={() => handleSort('duration')} className="sortable-column">
                            Duration
                            {renderArrow('duration')}
                        </th>
                        <th onClick={() => handleSort('amountOwed')} className="sortable-column">
                            Amount Owed
                            {renderArrow('amountOwed')}
                        </th>
                        <th>Settings</th>
                        <th onClick={() => handleSort('status')} className="sortable-column">
                            Status
                            {renderArrow('status')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {filteredResults.map((entry, index) => (
                        <tr
                            key={index}
                            style={{ backgroundColor: index % 2 === 0 ? '#31343C' : '#2B2E35' }}
                        >
                            <td>{entry.plate}</td>
                            <td>{new Date(entry.timestampIn).toISOString().split('T')[0]}</td>
                            <td>{calculateDuration(entry.timestampIn, entry.timestampOut)}</td>
                            <td>${entry.amountOwed}</td>
                            <td>
                                <a href={entry.settingsLink} target="_blank" rel="noopener noreferrer">
                                    🡥  View
                                </a>
                            </td>
                            <td>
                                <span className={`status-badge ${entry.status.toLowerCase()}`}>
                                    {entry.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default BillingCalculator;
