const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// mongoose.connect('mongodb://localhost:27017/roxiler', {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.connect('mongodb://127.0.0.1:27017/roxiler')
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch((err) => console.error('MongoDB Connection Error:', err));

const transactionSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    category: String,
    dateOfSale: Date,
    sold: Boolean,
})

const Transaction = mongoose.model('Transaction', transactionSchema);

app.get('/api/initialize', async(req,res)=> {
    try{
        const {data} = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        await Transaction.deleteMany();
        await Transaction.insertMany(data);
        res.status(200).send('Database initialized successfully!');
    } catch(err){
        res.status(500).send(err.message);
    }
})

app.get('/api/transactions', async(req, res) => {
    const { month, search, page = 1, perPage = 10 } = req.query;
    
    try{
        const monthNumber = parseInt(month, 10);

        const filter = { 
            ...(search && { $or: [
                {title: {$regex: search, $options:'i'}},
                {description: {$regex: search, $options: 'i'}}, 
                {price: parseFloat(search)},
                ] 
            }),
        };

        const transactions = await Transaction.aggregate([
            {
                $addFields: {
                    saleMonth: { $month: '$dateOfSale' },
                },
            },
            {
                $match: {
                    saleMonth: monthNumber,
                    ...filter,
                },
            },
            { $skip: (page -1)*perPage},
            { $limit: parseInt(perPage, 10)},
        ]);

        const count = await Transaction.aggregate([
            {
                $addFields: {
                    saleMonth: { $month: '$dateOfSale'},
                },
            },
            {
                $match: {
                    saleMonth: monthNumber,
                    ...filter,
                },
            },
            {
                $count: 'total'
            },
        ]);
        console.log('Filter:', JSON.stringify(filter, null, 2));
        res.json({ transactions, count: count[0]?.total || 0});
    }catch (error){
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/statistics', async (req, res) => {
    const { month } = req.query;

    try {
        // Ensure month is a valid number
        const monthNumber = parseInt(month, 10);

        if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
            return res.status(400).json({ error: 'Invalid month parameter' });
        }

        const totalSaleAmount = await Transaction.aggregate([
            {
                $addFields: {
                    saleMonth: { $month: '$dateOfSale' }, 
                },
            },
            {
                $match: {
                    saleMonth: monthNumber, 
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$price' },
                    soldItems: { $sum: { $cond: [{ $eq: ['$sold', true] }, 1, 0] } },
                    notSoldItems: { $sum: { $cond: [{ $eq: ['$sold', false] }, 1, 0] } },
                },
            },
        ]);

        if (totalSaleAmount.length === 0) {
            return res.json({
                totalSaleAmount: 0,
                totalSoldItems: 0,
                totalNotSoldItems: 0,
            });
        }

        res.json({
            totalSaleAmount: totalSaleAmount[0].total,
            totalSoldItems: totalSaleAmount[0].soldItems,
            totalNotSoldItems: totalSaleAmount[0].notSoldItems,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/bar-chart', async (req, res) => {
    const { month } = req.query;

    try {
        const monthNumber = parseInt(month, 10);

        if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
            return res.status(400).json({ error: 'Invalid month parameter' });
        }

        const year = 2022;

        const startOfMonth = new Date(year, monthNumber - 1, 1); 
        const endOfMonth = new Date(year, monthNumber, 1);       

        console.log(`Start of Month: ${startOfMonth}`);
        console.log(`End of Month: ${endOfMonth}`);

        const priceRanges = [
            { range: '0-100', min: 0, max: 100 },
            { range: '101-200', min: 101, max: 200 },
            { range: '201-300', min: 201, max: 300 },
            { range: '301-400', min: 301, max: 400 },
            { range: '401-500', min: 401, max: 500 },
            { range: '501-600', min: 501, max: 600 },
            { range: '601-700', min: 601, max: 700 },
            { range: '701-800', min: 701, max: 800 },
            { range: '801-900', min: 801, max: 900 },
            { range: '901-above', min: 901, max: Infinity },
        ];

        const barChartData = await Promise.all(
            priceRanges.map(async (range) => {
                const count = await Transaction.countDocuments({
                    dateOfSale: { $gte: startOfMonth, $lt: endOfMonth },
                    price: { $gte: range.min, $lt: range.max },
                });
                return { range: range.range, count };
            })
        );

        res.json(barChartData);
    } catch (error) {
        console.error('Error in /api/bar-chart:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/pie-chart', async (req, res) => {
    const { month } = req.query;

    try {
        const monthNumber = parseInt(month, 10);

        if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
            return res.status(400).json({ error: 'Invalid month parameter' });
        }

        const pieChartData = await Transaction.aggregate([
            {
                $addFields: {
                    saleMonth: { $month: '$dateOfSale' },
                },
            },
            {
                $match: {
                    saleMonth: monthNumber,
                },
            },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                },
            },
        ]);

        res.json(pieChartData);
    } catch (error) {
        console.error('Error in /api/pie-chart:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/combined', async (req, res) => {
    const { month } = req.query;

    try {
        const monthNumber = parseInt(month, 10);

        if (isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
            return res.status(400).json({ error: 'Invalid month parameter' });
        }

        const year = 2022;

        const startOfMonth = new Date(year, monthNumber - 1, 1); 
        const endOfMonth = new Date(year, monthNumber, 1);       

        console.log(`Start of Month: ${startOfMonth}`);
        console.log(`End of Month: ${endOfMonth}`);

        const priceRanges = [
            { range: '0-100', min: 0, max: 100 },
            { range: '101-200', min: 101, max: 200 },
            { range: '201-300', min: 201, max: 300 },
            { range: '301-400', min: 301, max: 400 },
            { range: '401-500', min: 401, max: 500 },
            { range: '501-600', min: 501, max: 600 },
            { range: '601-700', min: 601, max: 700 },
            { range: '701-800', min: 701, max: 800 },
            { range: '801-900', min: 801, max: 900 },
            { range: '901-above', min: 901, max: Infinity },
        ];

        const [transactions, statistics, barChart, pieChart] = await Promise.all([
            Transaction.find({
                dateOfSale: { $gte: startOfMonth, $lt: endOfMonth },
            }),

            Transaction.aggregate([
                {
                    $match: {
                        dateOfSale: { $gte: startOfMonth, $lt: endOfMonth },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalSaleAmount: { $sum: '$price' },
                        totalSoldItems: { $sum: { $cond: [{ $eq: ['$sold', true] }, 1, 0] } },
                        totalNotSoldItems: { $sum: { $cond: [{ $eq: ['$sold', false] }, 1, 0] } },
                    },
                },
            ]),

            Promise.all(
                priceRanges.map(async (range) => {
                    const count = await Transaction.countDocuments({
                        dateOfSale: { $gte: startOfMonth, $lt: endOfMonth },
                        price: { $gte: range.min, $lt: range.max },
                    });
                    return { range: range.range, count };
                })
            ),

            Transaction.aggregate([
                {
                    $match: {
                        dateOfSale: { $gte: startOfMonth, $lt: endOfMonth },
                    },
                },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        res.json({
            transactions,
            statistics: statistics[0] || {
                totalSaleAmount: 0,
                totalSoldItems: 0,
                totalNotSoldItems: 0,
            },
            barChart,
            pieChart,
        });
    } catch (error) {
        console.error('Error in /api/combined:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => 
    console.log("Server started Successfully")
);