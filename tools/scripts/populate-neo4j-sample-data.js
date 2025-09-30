#!/usr/bin/env node

/**
 * Populate Neo4j with TutorWise Sample Data
 * This will create real nodes and relationships you can see in Neo4j Browser
 */

require('dotenv').config({ path: '.env.local' });
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

async function createSampleData() {
  const session = driver.session();

  try {
    console.log('🚀 Creating TutorWise sample data in Neo4j...\n');

    // Clear existing data
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('✅ Cleared existing data');

    // Create Users
    await session.run(`
      CREATE
        (u1:User {id: 1, email: 'john.tutor@example.com', name: 'John Smith', role: 'tutor', created_at: datetime()}),
        (u2:User {id: 2, email: 'alice.student@example.com', name: 'Alice Johnson', role: 'student', created_at: datetime()}),
        (u3:User {id: 3, email: 'bob.tutor@example.com', name: 'Bob Wilson', role: 'tutor', created_at: datetime()}),
        (u4:User {id: 4, email: 'emma.student@example.com', name: 'Emma Davis', role: 'student', created_at: datetime()})
    `);
    console.log('✅ Created Users');

    // Create Tutors
    await session.run(`
      MATCH (u1:User {id: 1}), (u3:User {id: 3})
      CREATE
        (t1:Tutor {id: 1, user_id: 1, specialization: 'Mathematics', rating: 4.8, hourly_rate: 45}),
        (t2:Tutor {id: 2, user_id: 3, specialization: 'Programming', rating: 4.9, hourly_rate: 65}),
        (u1)-[:IS_TUTOR]->(t1),
        (u3)-[:IS_TUTOR]->(t2)
    `);
    console.log('✅ Created Tutors');

    // Create Students
    await session.run(`
      MATCH (u2:User {id: 2}), (u4:User {id: 4})
      CREATE
        (s1:Student {id: 1, user_id: 2, grade_level: 'High School', learning_goals: 'Improve SAT Math scores'}),
        (s2:Student {id: 2, user_id: 4, grade_level: 'College', learning_goals: 'Learn web development'}),
        (u2)-[:IS_STUDENT]->(s1),
        (u4)-[:IS_STUDENT]->(s2)
    `);
    console.log('✅ Created Students');

    // Create Courses
    await session.run(`
      CREATE
        (c1:Course {id: 1, title: 'Algebra Fundamentals', description: 'Master basic algebra concepts', category: 'Mathematics', price: 199}),
        (c2:Course {id: 2, title: 'Calculus I', description: 'Introduction to differential calculus', category: 'Mathematics', price: 299}),
        (c3:Course {id: 3, title: 'JavaScript Basics', description: 'Learn programming with JavaScript', category: 'Programming', price: 249}),
        (c4:Course {id: 4, title: 'React Development', description: 'Build modern web apps with React', category: 'Programming', price: 399})
    `);
    console.log('✅ Created Courses');

    // Create Teaching Relationships
    await session.run(`
      MATCH (t1:Tutor {id: 1}), (t2:Tutor {id: 2})
      MATCH (c1:Course {id: 1}), (c2:Course {id: 2}), (c3:Course {id: 3}), (c4:Course {id: 4})
      CREATE
        (t1)-[:TEACHES]->(c1),
        (t1)-[:TEACHES]->(c2),
        (t2)-[:TEACHES]->(c3),
        (t2)-[:TEACHES]->(c4)
    `);
    console.log('✅ Created Teaching relationships');

    // Create Enrollments
    await session.run(`
      MATCH (s1:Student {id: 1}), (s2:Student {id: 2})
      MATCH (c1:Course {id: 1}), (c3:Course {id: 3})
      CREATE
        (s1)-[:ENROLLED_IN]->(c1),
        (s2)-[:ENROLLED_IN]->(c3)
    `);
    console.log('✅ Created Enrollments');

    // Create Sessions
    await session.run(`
      MATCH (t1:Tutor {id: 1}), (t2:Tutor {id: 2})
      MATCH (s1:Student {id: 1}), (s2:Student {id: 2})
      CREATE
        (sess1:Session {id: 1, scheduled_at: datetime('2024-10-01T14:00:00Z'), duration: 60, status: 'completed'}),
        (sess2:Session {id: 2, scheduled_at: datetime('2024-10-02T16:00:00Z'), duration: 90, status: 'scheduled'}),
        (t1)-[:CONDUCTS]->(sess1),
        (t2)-[:CONDUCTS]->(sess2),
        (s1)-[:ATTENDS]->(sess1),
        (s2)-[:ATTENDS]->(sess2)
    `);
    console.log('✅ Created Sessions');

    // Create some indexes for performance
    await session.run('CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email)');
    await session.run('CREATE INDEX course_category IF NOT EXISTS FOR (c:Course) ON (c.category)');
    console.log('✅ Created Indexes');

    console.log('\n🎉 Sample data creation completed!');
    console.log('\n📊 Data Summary:');

    const stats = await session.run(`
      RETURN
        count{(u:User)} as users,
        count{(t:Tutor)} as tutors,
        count{(s:Student)} as students,
        count{(c:Course)} as courses,
        count{(sess:Session)} as sessions
    `);

    const record = stats.records[0];
    console.log(`- Users: ${record.get('users')}`);
    console.log(`- Tutors: ${record.get('tutors')}`);
    console.log(`- Students: ${record.get('students')}`);
    console.log(`- Courses: ${record.get('courses')}`);
    console.log(`- Sessions: ${record.get('sessions')}`);

    console.log('\n🔍 Try these queries in Neo4j Browser:');
    console.log('1. MATCH (n) RETURN n LIMIT 25');
    console.log('2. MATCH (s:Student)-[:ENROLLED_IN]->(c:Course)<-[:TEACHES]-(t:Tutor) RETURN s,c,t');
    console.log('3. MATCH (u:User)-[:IS_TUTOR]->(t:Tutor)-[:TEACHES]->(c:Course) RETURN u.name, c.title, t.hourly_rate');

  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

createSampleData();