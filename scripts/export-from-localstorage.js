/**
 * LocalStorage to Database Migration Script
 * Run this in your browser console on the OLD version (v1) to export data
 */

(function () {
    console.log('=== Job Board Migration Tool ===\n');

    // Get data from localStorage
    const stored = localStorage.getItem('jobApplications');

    if (!stored) {
        console.log('❌ No job data found in localStorage.');
        console.log('Make sure you are running this on the v1 version of the app.');
        return;
    }

    const jobs = JSON.parse(stored);

    if (jobs.length === 0) {
        console.log('❌ No jobs to migrate.');
        return;
    }

    console.log(`✓ Found ${jobs.length} job(s) in localStorage\n`);

    // Create export data
    const exportData = JSON.stringify(jobs, null, 2);

    console.log('=== INSTRUCTIONS ===\n');
    console.log('1. Copy the JSON data below (select all and copy)');
    console.log('2. Save it to a file called migration-data.json');
    console.log('3. In the NEW version (v2), create an account and login');
    console.log('4. Then use the upload script to import this data\n');
    console.log('=== COPY THIS JSON DATA ===\n');
    console.log(exportData);
    console.log('\n=== END OF DATA ===\n');

    // Also create a download link
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✓ Also triggered automatic download of migration-data.json');
    console.log('\nMigration export complete!');
})();
