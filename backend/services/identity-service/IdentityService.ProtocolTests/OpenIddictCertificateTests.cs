using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using IdentityService.Api.Setup;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using OpenIddict.Server;

namespace IdentityService.ProtocolTests;

public sealed class OpenIddictCertificateTests : IDisposable
{
    private const string Password = "senha-somente-do-teste";
    private static readonly DateTimeOffset Now = new(2026, 11, 26, 12, 0, 0, TimeSpan.Zero);
    private readonly string _directory = Directory.CreateTempSubdirectory("agenza-pfx-").FullName;

    [Fact]
    public void Carrega_os_dois_pfx_e_preserva_as_chaves_entre_inicializacoes()
    {
        var configuration = Configure();
        var first = Register(configuration);
        var second = Register(configuration);
        try
        {
            first.SigningCredentials.Should().ContainSingle();
            first.EncryptionCredentials.Should().ContainSingle();
            first.SigningCredentials[0].Key.KeyId.Should().NotBe(first.EncryptionCredentials[0].Key.KeyId);
            first.SigningCredentials[0].Key.KeyId.Should().Be(second.SigningCredentials[0].Key.KeyId);
            first.EncryptionCredentials[0].Key.KeyId.Should().Be(second.EncryptionCredentials[0].Key.KeyId);
            using var key = ((X509SecurityKey)first.SigningCredentials[0].Key).Certificate.GetRSAPrivateKey()!;
            var data = "verificacao"u8.ToArray();
            var signature = key.SignData(data, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            key.VerifyData(data, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1).Should().BeTrue();
            using var encryption = ((X509SecurityKey)first.EncryptionCredentials[0].Key).Certificate.GetRSAPrivateKey()!;
            encryption.Decrypt(encryption.Encrypt(data, RSAEncryptionPadding.OaepSHA256), RSAEncryptionPadding.OaepSHA256)
                .Should().Equal(data);
        }
        finally
        {
            DisposeCertificates(first);
            DisposeCertificates(second);
        }
    }

    [Theory]
    [InlineData("Signing", "Path")]
    [InlineData("Signing", "Password")]
    [InlineData("Encryption", "Path")]
    [InlineData("Encryption", "Password")]
    public void Recusa_configuracao_ausente_sem_expor_segredos(string purpose, string field)
    {
        var configuration = Configure();
        configuration[$"Identity:Certificates:{purpose}:{field}"] = null;
        var act = () => Register(configuration);
        var error = act.Should().Throw<InvalidOperationException>().Which;
        error.Message.Should().Contain($"Identity:Certificates:{purpose}").And.Contain(field);
        error.ToString().Should().NotContain(Password);
    }

    [Theory]
    [InlineData("Signing", "missing", "Unable to load")]
    [InlineData("Encryption", "password", "Unable to load")]
    [InlineData("Signing", "invalid", "Unable to load")]
    [InlineData("Signing", "public", "RSA private key")]
    [InlineData("Encryption", "expired", "validity period")]
    [InlineData("Signing", "future", "validity period")]
    [InlineData("Signing", "usage", "key usage")]
    [InlineData("Encryption", "usage", "key usage")]
    public void Recusa_certificado_invalido_sem_expor_segredos(string purpose, string failure, string message)
    {
        var configuration = Configure();
        var prefix = $"Identity:Certificates:{purpose}";
        configuration[$"{prefix}:Path"] = CreatePfx(purpose, failure);
        if (failure == "password")
        {
            configuration[$"{prefix}:Password"] = "senha-incorreta";
        }
        var act = () => Register(configuration);
        var error = act.Should().Throw<InvalidOperationException>().Which;
        error.Message.Should().Contain(prefix).And.Contain(message);
        error.ToString().Should().NotContain(Password).And.NotContain("senha-incorreta").And.NotContain(_directory);
    }

    [Fact]
    public void Recusa_o_mesmo_certificado_nas_duas_finalidades()
    {
        var configuration = Configure();
        var shared = CreatePfx("Signing", "shared");
        configuration["Identity:Certificates:Signing:Path"] = shared;
        configuration["Identity:Certificates:Encryption:Path"] = shared;
        var act = () => Register(configuration);
        act.Should().Throw<InvalidOperationException>().WithMessage("*must be different*");
    }

    private IConfigurationRoot Configure()
    {
        return new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Identity:Certificates:Signing:Path"] = CreatePfx("Signing"),
            ["Identity:Certificates:Signing:Password"] = Password,
            ["Identity:Certificates:Encryption:Path"] = CreatePfx("Encryption"),
            ["Identity:Certificates:Encryption:Password"] = Password,
        }).Build();
    }

    private static OpenIddictServerOptions Register(IConfiguration configuration)
    {
        var services = new ServiceCollection().AddOptions();
        new OpenIddictServerBuilder(services).AddConfiguredCertificates(configuration, new FixedTimeProvider());
        using var provider = services.BuildServiceProvider();
        return provider.GetRequiredService<IOptions<OpenIddictServerOptions>>().Value;
    }

    private string CreatePfx(string purpose, string? failure = null)
    {
        var path = Path.Combine(_directory, $"{Guid.NewGuid():N}.pfx");
        if (failure == "missing")
        {
            return path;
        }
        if (failure == "invalid")
        {
            File.WriteAllText(path, "invalido");
            return path;
        }
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest("CN=Teste", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        var usage = purpose == "Signing" ? X509KeyUsageFlags.DigitalSignature : X509KeyUsageFlags.KeyEncipherment;
        if (failure == "usage")
        {
            usage = X509KeyUsageFlags.DataEncipherment;
        }
        if (failure == "shared")
        {
            usage |= X509KeyUsageFlags.KeyEncipherment;
        }
        request.CertificateExtensions.Add(new X509KeyUsageExtension(usage, critical: true));
        using var certificate = request.CreateSelfSigned(
            Now.AddDays(failure == "future" ? 1 : -2), Now.AddDays(failure == "expired" ? -1 : 2));
        using var publicOnly = X509CertificateLoader.LoadCertificate(certificate.Export(X509ContentType.Cert));
        File.WriteAllBytes(path, (failure == "public" ? publicOnly : certificate).Export(X509ContentType.Pfx, Password));
        return path;
    }

    private static void DisposeCertificates(OpenIddictServerOptions options)
    {
        foreach (var credential in options.SigningCredentials)
        {
            ((X509SecurityKey)credential.Key).Certificate.Dispose();
        }
        foreach (var credential in options.EncryptionCredentials)
        {
            ((X509SecurityKey)credential.Key).Certificate.Dispose();
        }
    }

    public void Dispose()
    {
        Directory.Delete(_directory, recursive: true);
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
