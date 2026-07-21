namespace ServicesService.IntegrationTests;

/// <summary>
/// XSS/SQLi-style regression fixtures - see docs/adr and the QA audit item on security tests.
/// EF Core's parameterized queries and the JSON API contract should treat these as inert data.
/// </summary>
public static class MaliciousPayloads
{
    public static IEnumerable<object[]> Values =>
        new List<object[]>
        {
            new object[] { "<script>alert(1)</script>" },
            new object[] { "<img src=x onerror=alert(1)>" },
            new object[] { "'; DROP TABLE Services; --" },
        };
}
