using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using OpenIddict.Server;

namespace IdentityService.Api.Setup;

public static class OpenIddictCertificateExtensions
{
    public static OpenIddictServerBuilder AddConfiguredCertificates(
        this OpenIddictServerBuilder options, IConfiguration configuration, TimeProvider timeProvider)
    {
        var now = timeProvider.GetUtcNow();
        var signing = Load(configuration, "Signing", X509KeyUsageFlags.DigitalSignature, now);
        X509Certificate2? encryption = null;
        try
        {
            encryption = Load(configuration, "Encryption", X509KeyUsageFlags.KeyEncipherment, now);
            if (signing.Thumbprint == encryption.Thumbprint)
            {
                throw new InvalidOperationException("Signing and encryption certificates must be different.");
            }

            return options.AddSigningCertificate(signing).AddEncryptionCertificate(encryption);
        }
        catch
        {
            signing.Dispose();
            encryption?.Dispose();
            throw;
        }
    }

    private static X509Certificate2 Load(
        IConfiguration configuration, string purpose, X509KeyUsageFlags usage, DateTimeOffset now)
    {
        var section = $"Identity:Certificates:{purpose}";
        var path = configuration[$"{section}:Path"];
        var password = configuration[$"{section}:Password"];
        if (string.IsNullOrWhiteSpace(path) || string.IsNullOrEmpty(password))
        {
            throw new InvalidOperationException($"Configure '{section}:Path' and '{section}:Password'.");
        }

        X509Certificate2 certificate;
        try
        {
            certificate = X509CertificateLoader.LoadPkcs12FromFile(path, password, X509KeyStorageFlags.EphemeralKeySet);
        }
        catch (Exception exception) when (exception is CryptographicException or IOException or UnauthorizedAccessException)
        {
            throw new InvalidOperationException($"Unable to load '{section}': check the PFX file, access permissions and password.");
        }

        try
        {
            using var key = certificate.GetRSAPrivateKey();
            if (key is null || key.KeySize < 2048)
            {
                throw new InvalidOperationException($"'{section}' requires an RSA private key of at least 2048 bits.");
            }

            if (now < certificate.NotBefore.ToUniversalTime() || now >= certificate.NotAfter.ToUniversalTime())
            {
                throw new InvalidOperationException($"'{section}' is outside its validity period.");
            }

            var keyUsage = certificate.Extensions.OfType<X509KeyUsageExtension>().FirstOrDefault();
            if (keyUsage is not null && !keyUsage.KeyUsages.HasFlag(usage))
            {
                throw new InvalidOperationException($"'{section}' does not allow the required key usage.");
            }

            return certificate;
        }
        catch
        {
            certificate.Dispose();
            throw;
        }
    }
}
