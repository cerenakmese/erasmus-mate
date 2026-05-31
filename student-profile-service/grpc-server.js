const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const pool = require('./db');
const PROTO_PATH = path.join(__dirname, '../proto/student_profile.proto');


const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const studentProto = grpc.loadPackageDefinition(packageDefinition).student;


const getStudentProfile = async (call, callback) => {
    try {
        const studentId = call.request.student_id;

        const result = await pool.query('SELECT * FROM students WHERE id = $1', [studentId]);

        if (result.rows.length === 0) {

            callback({
                code: grpc.status.NOT_FOUND,
                details: "Student not found"
            });
            return;
        }

        const student = result.rows[0];


        callback(null, {
            id: student.id,
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email,
            home_university: student.home_university,
            host_university: student.host_university
        });

    } catch (err) {
        console.error("gRPC Error:", err);
        callback({
            code: grpc.status.INTERNAL,
            details: "Database error"
        });
    }
};

const startGrpcServer = () => {
    const server = new grpc.Server();
    server.addService(studentProto.StudentService.service, { getStudentProfile });


    const PORT = '0.0.0.0:50052';
    server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error("Failed to bind gRPC server:", err);
            return;
        }
        console.log(`Student Profile gRPC Server running on port ${port}`);
    });
};

module.exports = startGrpcServer;
