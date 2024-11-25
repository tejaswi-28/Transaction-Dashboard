import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const App = () => {
    const [transactions, setTransactions] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [barChart, setBarChart] = useState([]);
    const [pieChart, setPieChart] = useState([]);
    const [month, setMonth] = useState('03'); // Default to March
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    const fetchTransactions = async () => {
        const response = await axios.get(`http://localhost:5000/api/transactions`, {
            params: { month, search, page },
        });
        setTransactions(response.data.transactions);
    };

    const fetchStatistics = async () => {
        const response = await axios.get(`http://localhost:5000/api/statistics`, {
            params: { month },
        });
        setStatistics(response.data);
    };

    const fetchBarChart = async () => {
        const response = await axios.get(`http://localhost:5000/api/bar-chart`, { params: { month } });
        setBarChart(response.data);
    };

    const fetchPieChart = async () => {
        const response = await axios.get(`http://localhost:5000/api/pie-chart`, { params: { month } });
        setPieChart(response.data);
    };

    useEffect(() => {
        fetchTransactions();
        fetchStatistics();
        fetchBarChart();
        fetchPieChart();
    }, [month, search, page]);

    return (
        <div className="container mt-5">
            <h1 className='text-center text-decoration-underline'>Roxiler Transactions Dashboard</h1>
            <div className='inputs'>
            <div className="mb-3">
                <label>Select Month:</label>
                <select className="form-control" value={month} onChange={(e) => setMonth(e.target.value)}>
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m) => (
                        <option key={m} value={m}>
                            {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mb-3">
                <label>Select Transaction:</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Search transactions"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            </div>

            <table className="table table-striped mt-5">
              <thead className='text-center border'>
                <tr className='border'>
                  <th className='border-end'>Title</th>
                  <th className='border-end'>Description</th>
                  <th className='border-end'>Price</th>
                  <th className='border-end' style={{ width: '10%' }}>Date of Sale</th>
                  <th className='border-end'>Sold</th>
                </tr>
              </thead>
                <tbody className='text-center'>
                    {transactions.map((t) => (
                        <tr key={t._id}>
                            <td className='border-end'>{t.title}</td>
                            <td className='border-end'>{t.description}</td>
                            <td className='border-end'>${t.price}</td>
                            <td className='border-end'>{new Date(t.dateOfSale).toLocaleDateString()}</td>
                            <td className='border-end'>{t.sold ? 'Yes' : 'No'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="d-flex justify-content-between">
                <button className="btn btn-primary" onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
                    Previous
                </button>
                <button className="btn btn-primary" onClick={() => setPage((prev) => prev + 1)}>
                    Next
                </button>
            </div>
                    <hr/>

            <div className="mt-5">
                <h2 className='text-center mb-4 text-decoration-underline'>Statistics</h2>
                <p className='text-center'>Total Sale Amount: ${statistics.totalSaleAmount}</p>
                <p className='text-center'>Total Sold Items: {statistics.totalSoldItems}</p>
                <p className='text-center'>Total Not Sold Items: {statistics.totalNotSoldItems}</p>
            </div>

                  <hr/>

            <div className='chart'> 
              <div className="mt-5">
                  <h3 className='mb-5 text-decoration-underline'>Bar Chart</h3>
                  <BarChart width={600} height={300} data={barChart}>
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
              </div>
              
              <div className="mt-5">
                  <h3 className='mb-0 text-decoration-underline'>Pie Chart</h3>
                  <PieChart width={400} height={400}>
                      <Pie
                          data={pieChart}
                          dataKey="count"
                          nameKey="_id"
                          cx="50%"
                          cy="50%"
                          outerRadius={150}
                          fill="#8884d8"
                      >
                          {pieChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                      </Pie>
                      <Tooltip />
                  </PieChart>
              </div>
            </div>
        </div>
    );
};

export default App;